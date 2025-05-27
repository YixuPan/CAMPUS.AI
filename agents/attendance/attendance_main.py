import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any, List, Tuple

from azure.cosmos import CosmosClient, exceptions as cosmos_exceptions
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.functions.kernel_function_decorator import kernel_function

from agents.base_agent import BaseAgent
from agents.attendance.attendance_skill import AttendanceSkill


class AttendanceAgent(BaseAgent):
    def get_agent_name(self) -> str:
        return "Attendance"

    def get_agent_description(self) -> str:
        return """Manages student and staff attendance for events, classes, and activities. 
        Can check people in to events and query attendance records."""

    def get_function_descriptions(self) -> List[Dict[str, str]]:
        return [{
            "name": "attendance",
            "description": "Use for checking in to events, querying attendance records, or managing event attendance."
        }]

    def get_configuration(self) -> Dict[str, Optional[str]]:
        """Fetches and returns necessary configurations from environment variables."""
        return {
            "openai_endpoint": os.getenv("AZURE_OPENAI_API_ENDPOINT"),
            "openai_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "deployment_name": os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini"),
            "api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            "cosmos_endpoint": os.getenv("COSMOS_ENDPOINT"),
            "cosmos_key": os.getenv("COSMOS_KEY"),
            "cosmos_db": os.getenv("COSMOS_DATABASE", "CampusData"),
            "cosmos_container": os.getenv("COSMOS_CONTAINER", "Attendance")
        }

    def initialize_kernel_and_service(self, config: Dict[str, Optional[str]]) -> Tuple[Kernel, AzureChatCompletion]:
        """Initializes and returns the Semantic Kernel and AzureChatCompletion service."""
        if not all([
            config["openai_endpoint"],
            config["openai_key"],
            config["deployment_name"],
            config["cosmos_endpoint"],
            config["cosmos_key"]
        ]):
            raise RuntimeError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME, "
                "COSMOS_ENDPOINT, and COSMOS_KEY environment variables.\n"
            )

        kernel = Kernel()
        az_service = AzureChatCompletion(
            service_id=f"{self.get_agent_name().lower()}_chat_service",
            api_key=config["openai_key"],
            endpoint=config["openai_endpoint"],
            deployment_name=config["deployment_name"],
            api_version=config["api_version"]
        )
        kernel.add_service(az_service)
        return kernel, az_service

    def initialize_skills(self, config: Dict[str, Optional[str]], kernel: Kernel) -> List[Any]:
        """Initialize and return the AttendanceSkill."""
        cosmos_client = CosmosClient(config["cosmos_endpoint"], config["cosmos_key"])
        attendance_skill = AttendanceSkill(
            cosmos_client=cosmos_client,
            db_name=config["cosmos_db"],
            container_name=config["cosmos_container"]
        )
        kernel.add_plugin(plugin=attendance_skill, plugin_name="AttendanceSkill")
        return [attendance_skill]

    def get_agent_instance(self, kernel: Kernel, service: AzureChatCompletion, skills: List[Any]) -> ChatCompletionAgent:
        """Instantiates and returns the Attendance Agent."""
        agent_instructions = (
            f"Current UTC time: {datetime.now(timezone.utc).isoformat()}\n"
            "You are a helpful assistant that manages check-ins and attendance queries. "
            "Use 'check_in_event' to record attendance, or 'query_attendance' to report on it. "
            "Always confirm actions taken or information found. "
            "If there are any issues with the database operations, clearly explain what went wrong."
        )
        
        agent = ChatCompletionAgent(
            kernel=kernel,
            name=f"{self.get_agent_name()}Agent",
            instructions=agent_instructions,
            service=service,
            plugins=["AttendanceSkill"]
        )
        return agent

    async def invoke_agent(self, agent: ChatCompletionAgent, query: str) -> str:
        """Invokes the Attendance Agent with the user query and returns the aggregated response."""
        full_response = []
        async for response_chunk in agent.invoke(messages=query):
            if response_chunk.content:
                content_str = str(response_chunk.content) if response_chunk.content is not None else ""
                full_response.append(content_str)
        return "".join(full_response)

