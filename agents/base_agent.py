from abc import ABC, abstractmethod
from typing import Dict, Optional, Any, List, Tuple
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.agents import ChatCompletionAgent

class BaseAgent(ABC):
    """Base class that all agents must implement to be compatible with the Triage Agent."""
    
    @abstractmethod
    def get_agent_name(self) -> str:
        """Return the name of this agent."""
        pass

    @abstractmethod
    def get_agent_description(self) -> str:
        """Return a description of what this agent can do, to be used in the triage prompt."""
        pass

    @abstractmethod
    def get_function_descriptions(self) -> List[Dict[str, str]]:
        """Return a list of dictionaries describing the functions this agent provides.
        Each dict should have 'name' and 'description' keys."""
        pass

    @abstractmethod
    def get_configuration(self) -> Dict[str, Optional[str]]:
        """Return the configuration needed for this agent (from env vars, etc)."""
        pass

    @abstractmethod
    def initialize_kernel_and_service(self, config: Dict[str, Optional[str]]) -> Tuple[Kernel, AzureChatCompletion]:
        """Initialize and return the kernel and service for this agent."""
        pass

    @abstractmethod
    def initialize_skills(self, config: Dict[str, Optional[str]], kernel: Kernel) -> List[Any]:
        """Initialize and return any skills/plugins this agent needs."""
        pass

    @abstractmethod
    def get_agent_instance(self, kernel: Kernel, service: AzureChatCompletion, skills: List[Any]) -> ChatCompletionAgent:
        """Return an instance of this agent."""
        pass

    @abstractmethod
    async def invoke_agent(self, agent: ChatCompletionAgent, query: str) -> str:
        """Invoke this agent with a query and return the response."""
        pass

    def get_prompt_contribution(self) -> str:
        """Return this agent's contribution to the triage prompt.
        This has a default implementation but can be overridden if needed."""
        functions = self.get_function_descriptions()
        function_descriptions = "\n".join([
            f"    *   `call_{self.get_agent_name().lower()}_agent`: {func['description']}"
            for func in functions
        ])
        
        return f"""The {self.get_agent_name()} Agent:
{self.get_agent_description()}

Available functions:
{function_descriptions}
""" 