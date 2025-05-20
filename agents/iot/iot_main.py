import os
from typing import Dict, Optional, Any, List, Tuple
from datetime import datetime, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.agents import ChatCompletionAgent

from agents.base_agent import BaseAgent
from agents.iot.iot_skills import IoTDataSkill

class IoTAgent(BaseAgent):
    def get_agent_name(self) -> str:
        return "IoT"

    def get_agent_description(self) -> str:
        return """Manages and monitors IoT devices across the campus, providing real-time data about 
        environmental conditions, device status, and sensor readings. Can detect anomalies and trends in IoT data."""

    def get_function_descriptions(self) -> List[Dict[str, str]]:
        return [{
            "name": "iot",
            "description": "Use for queries about the physical campus environment, such as the status of IoT devices (e.g., AC, lights, projectors), sensor readings (e.g., temperature, occupancy), identifying data anomalies, or summarizing trends from IoT data."
        }]

    def get_configuration(self) -> Dict[str, str]:
        """Get the configuration for the IoT Agent from environment variables."""
        return {
            "azure_openai_api_endpoint": os.getenv("AZURE_OPENAI_API_ENDPOINT"),
            "azure_openai_api_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "azure_openai_deployment_name": os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"),
            "azure_openai_api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            "cosmos_connection_string": os.getenv("COSMOS_CONNECTION_STRING"),
            "cosmos_db_name": os.getenv("COSMOS_DB_NAME", "CampusData"),
            "cosmos_container_name": os.getenv("COSMOS_CONTAINER_NAME", "Students")
        }

    def _validate_configuration(self, config: Dict[str, str]):
        """Validate the essential configuration parameters."""
        required_keys = ["azure_openai_api_endpoint", "azure_openai_api_key", "azure_openai_deployment_name"]
        missing_keys = [key for key in required_keys if not config.get(key)]
        if missing_keys:
            raise ValueError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME "
                "environment variables for the IoT agent."
            )

    def initialize_kernel_and_service(self, config: Dict[str, Optional[str]]) -> Tuple[Kernel, AzureChatCompletion]:
        """Initializes and returns the Semantic Kernel and AzureChatCompletion service for IoT agent."""
        if not all([config["azure_openai_api_endpoint"], config["azure_openai_api_key"], config["azure_openai_deployment_name"]]):
            raise RuntimeError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME "
                "environment variables for the IoT agent.\n"
                f"AZURE_OPENAI_API_ENDPOINT: {config['azure_openai_api_endpoint']}\n"
                f"AZURE_OPENAI_API_KEY: {config['azure_openai_api_key']}\n"
                f"AZURE_OPENAI_DEPLOYMENT_NAME: {config['azure_openai_deployment_name']}\n"
            )
        
        kernel = Kernel()
        az_service = AzureChatCompletion(
            service_id=f"{self.get_agent_name().lower()}_chat_service",
            api_key=config["azure_openai_api_key"],
            endpoint=config["azure_openai_api_endpoint"],
            deployment_name=config["azure_openai_deployment_name"],
            api_version=config["azure_openai_api_version"]
        )
        kernel.add_service(az_service)
        return kernel, az_service

    def initialize_skills(self, config: Dict[str, Optional[str]], kernel: Kernel) -> List[Any]:
        """Initialize and return the IoTDataPlugin if possible."""
        skills = []
        if config["cosmos_connection_string"]:
            try:
                iot_plugin = IoTDataSkill(
                    config["cosmos_connection_string"],
                    config["cosmos_db_name"],
                    config["cosmos_container_name"]
                )
                kernel.add_plugin(plugin=iot_plugin, plugin_name="IoTPlugin")
                skills.append(iot_plugin)
                print(f"[{self.get_agent_name()}Agent] IoTPlugin loaded successfully.")
            except Exception as e:
                print(f"[{self.get_agent_name()}Agent] Warning: Failed to initialize IoTDataSkill: {e}")
        else:
            print(f"[{self.get_agent_name()}Agent] Warning: COSMOS_CONNECTION_STRING not found. IoTDataSkill will not be available.")
        return skills

    def get_agent_instance(self, kernel: Kernel, service: AzureChatCompletion, skills: List[Any]) -> ChatCompletionAgent:
        """Instantiates and returns the IoT Agent."""
        agent_instructions = f"""
        Current UTC time: {datetime.now(timezone.utc).isoformat()}
        You are an AI assistant for a smart campus.
        Your primary role is to analyze IoT sensor data and answer user queries based on this data.

        Instructions:
        1.  When a user asks a question that might require current campus conditions or sensor data, first try to use the 'get_latest_telemetry' function from the 'IoTPlugin' to fetch recent IoT sensor readings.
        2.  The IoT data will be provided to you as a JSON string. Analyze this IoT data in conjunction with the user's query to provide a concise and relevant answer.
        3.  If the 'get_latest_telemetry' function returns an error, indicates data retrieval issues, or if the IoTDataSkill is unavailable (e.g., due to missing configuration or initialization failure), inform the user that current IoT data cannot be accessed. Then, try to answer based on general knowledge if possible, or state that the query cannot be fulfilled without live data.
        4.  If the user's query is general and does not explicitly require IoT data (e.g., "hello", "what can you do?"), respond appropriately without attempting to fetch data if it's not necessary.
        5.  Be helpful and clear in your responses. If data is unavailable, clearly state this limitation.
        """
        
        plugins_for_agent = ["IoTPlugin"] if skills else []

        agent = ChatCompletionAgent(
            kernel=kernel,
            name=f"{self.get_agent_name()}Agent",
            instructions=agent_instructions,
            service=service,
            plugins=plugins_for_agent
        )
        return agent

    async def invoke_agent(self, agent: ChatCompletionAgent, query: str) -> str:
        """Invokes the IoT Agent with the user query and returns the aggregated response."""
        full_response = []
        async for response_chunk in agent.invoke(messages=query):
            if response_chunk.content:
                content_str = str(response_chunk.content) if response_chunk.content is not None else ""
                full_response.append(content_str)
        return "".join(full_response) 