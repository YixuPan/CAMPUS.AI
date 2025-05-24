import os
import asyncio
from dotenv import load_dotenv

load_dotenv() # Load the environment before calling the agents

from semantic_kernel.contents import ChatMessageContent
from agents import CalendarAgent, IoTAgent, SpeechAgent, AttendanceAgent, TriageAgent

SHOW_THOUGHTS = "true"

async def main():
    print("\n--- Triage Agent Initialized ---")
    print("This agent will formulate plans and delegate to available specialized agents.")
    print("Type 'exit' or 'quit' to stop.")

    triage_agent_instance = TriageAgent(show_thoughts=SHOW_THOUGHTS, available_agents=[CalendarAgent, IoTAgent, SpeechAgent, AttendanceAgent])
    triage_agent = triage_agent_instance.triage_agent
    conversation_history = []

    while True:
        try:
            user_input = input("\nUser > ")
        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break
        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break
        if not user_input.strip():
            continue

        print("\nTriageAgent processing...")
        
        # Prepare messages for the agent, including history
        messages_for_agent = []
        for entry in conversation_history:
            # Create ChatMessageContent objects from stored history dicts
            messages_for_agent.append(ChatMessageContent(role=entry["role"], content=entry["content"]))
        # Create ChatMessageContent for the current user input
        messages_for_agent.append(ChatMessageContent(role="user", content=user_input))

        try:
            agent_response_content = ""
            async for message_chunk in triage_agent.invoke(messages=messages_for_agent):
                if message_chunk.content:
                    content_str = str(message_chunk.content) if message_chunk.content is not None else ""
                    print(content_str, end="", flush=True)
                    agent_response_content += content_str
            print()  # Newline after response

            # Add current turn to history
            conversation_history.append({"role": "user", "content": user_input})
            conversation_history.append({"role": "assistant", "content": agent_response_content})

        except Exception as e:
            print(f"\n[TriageAgent ERROR] An error occurred during invocation: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except RuntimeError as e:
        print(f"\n[MAIN ERROR] Initialization Error: {e}")
    except Exception as e:
        print(f"\n[MAIN ERROR] An unexpected error occurred: {e}") 