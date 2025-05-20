import os
from typing import Dict, Optional, Any, List, Tuple
from datetime import datetime, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.functions.kernel_function_decorator import kernel_function

from agents.base_agent import BaseAgent
from agents.speech.speech_skills import SpeechSkill

class SpeechAgent(BaseAgent):
    def get_agent_name(self) -> str:
        return "Speech"

    def get_agent_description(self) -> str:
        return """Handles speech recognition tasks, converting spoken words into text using Azure's 
        Cognitive Services Speech-to-Text capabilities. Can be used for voice commands and dictation."""

    def get_function_descriptions(self) -> List[Dict[str, str]]:
        return [{
            "name": "speech",
            "description": "Use for converting speech to text, listening to voice commands, or any task requiring speech recognition."
        }]

    def get_configuration(self) -> Dict[str, Optional[str]]:
        """Fetches and returns necessary configurations from environment variables."""
        return {
            "openai_endpoint": os.getenv("AZURE_OPENAI_API_ENDPOINT"),
            "openai_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "deployment_name": os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini"),
            "api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            "speech_key": os.getenv("SPEECH_KEY"),
            "speech_region": os.getenv("SPEECH_REGION")
        }

    def initialize_kernel_and_service(self, config: Dict[str, Optional[str]]) -> Tuple[Kernel, AzureChatCompletion]:
        """Initializes and returns the Semantic Kernel and AzureChatCompletion service."""
        if not all([
            config["openai_endpoint"], 
            config["openai_key"], 
            config["deployment_name"],
            config["speech_key"],
            config["speech_region"]
        ]):
            raise RuntimeError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME, "
                "SPEECH_KEY, and SPEECH_REGION environment variables.\n"
                f"AZURE_OPENAI_API_ENDPOINT: {config['openai_endpoint']}\n"
                f"AZURE_OPENAI_API_KEY: {config['openai_key']}\n"
                f"AZURE_OPENAI_DEPLOYMENT_NAME: {config['deployment_name']}\n"
                f"SPEECH_KEY: {config['speech_key']}\n"
                f"SPEECH_REGION: {config['speech_region']}\n"
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
        """Initialize and return the SpeechSkill."""
        speech_skill = SpeechSkill()
        kernel.add_plugin(plugin=speech_skill, plugin_name="SpeechSkill")
        return [speech_skill]

    def get_agent_instance(self, kernel: Kernel, service: AzureChatCompletion, skills: List[Any]) -> ChatCompletionAgent:
        """Instantiates and returns the Speech Agent."""
        agent_instructions = (
            f"Current UTC time: {datetime.now(timezone.utc).isoformat()}\n"
            "You are a helpful assistant that can convert speech to text using the microphone. "
            "Use the 'listen_to_speech' function from the SpeechSkill to capture voice input. "
            "Always confirm when you've captured speech and what was recognized. "
            "If there are any issues with speech recognition, clearly explain what went wrong."
        )
        
        agent = ChatCompletionAgent(
            kernel=kernel,
            name=f"{self.get_agent_name()}Agent",
            instructions=agent_instructions,
            service=service,
            plugins=["SpeechSkill"]
        )
        return agent

    async def invoke_agent(self, agent: ChatCompletionAgent, query: str) -> str:
        """Invokes the Speech Agent with the user query and returns the aggregated response."""
        full_response = []
        async for response_chunk in agent.invoke(messages=query):
            if response_chunk.content:
                content_str = str(response_chunk.content) if response_chunk.content is not None else ""
                full_response.append(content_str)
        return "".join(full_response)
