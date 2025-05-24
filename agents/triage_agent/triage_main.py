import os
from typing import Dict, List, Type
from datetime import datetime, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent

from agents.base_agent import BaseAgent 

# --- Azure OpenAI Setup for Triage Agent ---
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")

class TriageAgent:
    def __init__(self, available_agents: List[Type[BaseAgent]], show_thoughts: bool = True):
        """Initialize with a list of agent classes that inherit from BaseAgent."""
        self.show_thoughts = show_thoughts
        print("Initializing TriageAgentPlugin and Triage Agent...")
        self.agents: Dict[str, Dict] = {}  # Store agent instances and their metadata
        
        if not all([AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME]):
            raise RuntimeError(
                "Please set AZURE_OPENAI_API_ENDPOINT, AZURE_OPENAI_CHAT_DEPLOYMENT_NAME, "
                "and AZURE_OPENAI_API_KEY environment variables for the Triage Agent. \n"
                f"AZURE_OPENAI_API_KEY: {AZURE_OPENAI_API_KEY} \n"
                f"AZURE_OPENAI_API_ENDPOINT: {AZURE_OPENAI_ENDPOINT} \n"
                f"AZURE_OPENAI_CHAT_DEPLOYMENT_NAME: {AZURE_OPENAI_DEPLOYMENT_NAME} \n"
            )

        # --- Semantic Kernel Setup for Triage Agent ---
        triage_kernel = Kernel()
        triage_service = AzureChatCompletion(
            service_id="triage_chat_service",
            api_key=AZURE_OPENAI_API_KEY,
            endpoint=AZURE_OPENAI_ENDPOINT,
            deployment_name=AZURE_OPENAI_DEPLOYMENT_NAME,
            api_version=AZURE_OPENAI_API_VERSION,
        )
        triage_kernel.add_service(triage_service)
        triage_kernel.add_plugin(plugin=self, plugin_name="SubAgentControls")
        print("SubAgentControls plugin added to Triage Kernel.")

        # Initialize sub-agents
        for agent_class in available_agents:
            try:
                agent = agent_class()
                agent_name = agent.get_agent_name()
                print(f"\nInitializing {agent_name} Agent...")
                
                # Get configuration and initialize kernel/service
                config = agent.get_configuration()
                kernel, service = agent.initialize_kernel_and_service(config)
                
                # Initialize skills
                skills = agent.initialize_skills(config, kernel)
                
                # Get agent instance
                agent_instance = agent.get_agent_instance(kernel, service, skills)
                
                # Store everything we need about this agent
                self.agents[agent_name] = {
                    "instance": agent_instance,
                    "base": agent,
                    "kernel": kernel,
                    "service": service,
                    "skills": skills
                }
                print(f"{agent_name} Agent initialized successfully.")
                
            except Exception as e:
                print(f"Failed to initialize {agent_class.__name__}: {e}")
                # Continue with other agents if one fails
                continue
        
        # --- Generate Triage Agent Instructions dynamically based on available agents ---
        TRIAGE_AGENT_INSTRUCTIONS = f"""
        You are a sophisticated Triage Agent. Your primary role is to understand complex user requests and orchestrate responses by intelligently delegating tasks to specialized agents.

        Current UTC time: {datetime.now(timezone.utc).isoformat()}

        **Available Agents and Their Capabilities:**

        {self.get_prompt_contributions()}

        **Conversation History:**
        You will be provided with the ongoing conversation history as a list of messages. Use this history to:
        - Understand the context of the current user request.
        - Avoid asking for information that has already been provided.
        - Interpret follow-up questions or commands correctly.
        - Maintain a coherent and natural conversation flow.
        The history will be part of the message list sent to you.
        Remember your primary role is to delegate to specialized agents based on the *current* user query, informed by the history.

        **Your Process:**

        1.  **Analyze User Request:** Carefully examine the user's query (and the preceding conversation history) to identify the core intent and any specific entities or constraints. Determine which of the available specialized agents (listed above) is best suited to handle the request or parts of it.

        2.  **Planning and Execution:**
            *   **Delegation:** Use the 'delegate_to_agent' function from the 'SubAgentControls' plugin to pass the task to the chosen specialized agent. You MUST specify the 'agent_name' (e.g., "Calendar", "IoT", "Speech", "Attendance") and the 'query' (the specific task or question for that agent).
            *   **Complex Queries (Multi-step):** If a query requires information or actions from multiple agents, or a sequence of steps:
                *   Formulate a clear, step-by-step plan.
                *   Execute the plan by calling the 'delegate_to_agent' function for each step, targeting the appropriate agent with the relevant part of the query.
                *   You MUST use the output from one agent call if it's needed as input or context for a subsequent call.
            *   **Response Evaluation:** After an agent call, evaluate its response. If it's not what you expected, if an error occurred (e.g., agent not found, or internal agent error), or if the response is insufficient, you may need to adjust your plan, retry with a modified query, choose a different agent, or inform the user if the task cannot be completed. Do not try to call an agent that previously failed to initialize.

        3.  **Clarification:** If the user's query is ambiguous or lacks necessary details for you to form a plan or select an agent, ask clarifying questions.

        4.  **Synthesize and Respond:**
            *   Once your plan is complete and you have the necessary information, synthesize a comprehensive and user-friendly response.
            *   Do not just return raw data from sub-agents unless it's the direct answer. Explain the outcome of the actions taken.
            *   If any part of the request could not be fulfilled, clearly state what was done and what couldn't be done, and why.

        Strictly use the 'delegate_to_agent' function within the 'SubAgentControls' plugin for all interactions with specialized agents.
        """

        # Instantiate and store the Triage Agent
        self.triage_agent = ChatCompletionAgent(
            kernel=triage_kernel,
            name="TriageAgent",
            instructions=TRIAGE_AGENT_INSTRUCTIONS,
            service=triage_service,
            plugins=["SubAgentControls"]
        )
        print("Triage Agent instantiated and ready.")


    def get_prompt_contributions(self) -> str:
        """Get the prompt contributions from all initialized agents."""
        contributions = []
        for agent_name, agent_data in self.agents.items():
            try:
                contribution = agent_data["base"].get_prompt_contribution()
                contributions.append(contribution)
            except Exception as e:
                print(f"Error getting prompt contribution from {agent_name}: {e}")
                continue
        return "\n\n".join(contributions)

    @kernel_function(name="delegate_to_agent", description="Delegates a task to a specified specialized agent.")
    async def delegate_to_agent(self, agent_name: str, query: str) -> str:
        """
        Dynamically invokes a specified sub-agent with a query.

        Args:
            agent_name: The name of the agent to delegate to (e.g., "Calendar", "IoT").
            query: The query or task for the specified agent.

        Returns:
            The response from the sub-agent or an error message.
        """
        if agent_name not in self.agents:
            return f"Error: Agent '{agent_name}' is not recognized or available. Available agents are: {list(self.agents.keys())}"
        
        agent_data = self.agents[agent_name]
        if self.show_thoughts:
            print(f"\n[Triage Thought Process] Delegating to {agent_name} Agent: '{query}'")
        
        try:
            response = await agent_data["base"].invoke_agent(agent_data["instance"], query)
            if self.show_thoughts:
                print(f"[Triage Thought Process] {agent_name} Agent Response: '{response}'")
            return response
        except Exception as e:
            error_msg = f"Error calling {agent_name} Agent: {e}"
            if self.show_thoughts:
                print(f"[Triage Thought Process] {error_msg}")
            return error_msg