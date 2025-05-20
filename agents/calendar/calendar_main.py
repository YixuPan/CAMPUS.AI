import os
from typing import Dict, Optional, Any, List, Tuple
from datetime import datetime, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.agents import ChatCompletionAgent

from agents.base_agent import BaseAgent
from agents.calendar.calendar_skills import CalendarSkill

class CalendarAgent(BaseAgent):
    def get_agent_name(self) -> str:
        return "Calendar"

    def get_agent_description(self) -> str:
        return """Handles all calendar-related operations including scheduling meetings, finding free slots, 
        canceling events, and reporting on schedules. Works with Microsoft Graph API to manage calendar events."""

    def get_function_descriptions(self) -> List[Dict[str, str]]:
        return [{
            "name": "calendar",
            "description": "Use for anything related to scheduling meetings, creating calendar events, finding free time slots, canceling events, or reporting on existing schedules."
        }]

    def get_configuration(self) -> Dict[str, str]:
        """Get the configuration for the Calendar Agent from environment variables."""
        return {
            "azure_openai_api_endpoint": os.getenv("AZURE_OPENAI_API_ENDPOINT"),
            "openai_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "azure_openai_deployment_name": os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"),
            "graph_access_token": os.getenv("GRAPH_ACCESS_TOKEN"),
        }

    def _validate_configuration(self, config: Dict[str, str]):
        """Validate the essential configuration parameters."""
        required_keys = ["azure_openai_api_endpoint", "openai_key", "azure_openai_deployment_name", "graph_access_token"]
        missing_keys = [key for key in required_keys if not config.get(key)]
        if missing_keys:
            raise ValueError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME, "
                "and GRAPH_ACCESS_TOKEN environment variables."
            )

    def initialize_kernel_and_service(self, config: Dict[str, Optional[str]]) -> Tuple[Kernel, AzureChatCompletion]:
        """Initializes and returns the Semantic Kernel and AzureChatCompletion service."""
        if not all([config["azure_openai_api_endpoint"], config["openai_key"], config["azure_openai_deployment_name"], config["graph_access_token"]]):
            raise RuntimeError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME, "
                "and GRAPH_ACCESS_TOKEN environment variables.\n"
                f"AZURE_OPENAI_API_ENDPOINT: {config['azure_openai_api_endpoint']}\n"
                f"AZURE_OPENAI_API_KEY: {config['openai_key']}\n"
                f"AZURE_OPENAI_DEPLOYMENT_NAME: {config['azure_openai_deployment_name']}\n"
                f"GRAPH_ACCESS_TOKEN: {config['graph_access_token']}\n"
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
        """Initialize and return the CalendarSkill."""
        calendar_skill = CalendarSkill(graph_token=config["graph_token"])
        kernel.add_plugin(plugin=calendar_skill, plugin_name="CalendarSkill")
        return [calendar_skill]

    def get_agent_instance(self, kernel: Kernel, service: AzureChatCompletion, skills: List[Any]) -> ChatCompletionAgent:
        """Instantiates and returns the Calendar Agent."""
        agent_instructions = (
            f"Current UTC time: {datetime.now(timezone.utc).isoformat()}\n"
            "You are a helpful assistant that can schedule or cancel calendar events and report schedule on UK london time. "
            "Use the function calling capability to invoke create_event, find_free_slots, cancel_events, or report_schedule as needed from the CalendarSkill."
            "Always confirm actions taken or information found."
        )
        
        agent = ChatCompletionAgent(
            kernel=kernel,
            name=f"{self.get_agent_name()}Agent",
            instructions=agent_instructions,
            service=service,
            plugins=["CalendarSkill"]
        )
        return agent

    async def invoke_agent(self, agent: ChatCompletionAgent, query: str) -> str:
        """Invokes the Calendar Agent with the user query and returns the aggregated response."""
        full_response = []
        async for response_chunk in agent.invoke(messages=query):
            if response_chunk.content:
                content_str = str(response_chunk.content) if response_chunk.content is not None else ""
                full_response.append(content_str)
        return "".join(full_response) 