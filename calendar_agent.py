import os
import requests
import asyncio
from typing import Optional, List

from dateutil import parser, tz
from datetime import datetime, timedelta, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent

# Load environment variables from .env file
import load_env

# Get credentials from environment variables, with empty string fallbacks
openai_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
openai_key      = os.environ.get("AZURE_OPENAI_KEY", "")
deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "o3-mini")
graph_token     = os.environ.get("GRAPH_ACCESS_TOKEN", "")

# Create a more informative error message for missing credentials
missing_credentials = []
if not openai_endpoint:
    missing_credentials.append("AZURE_OPENAI_ENDPOINT")
if not openai_key:
    missing_credentials.append("AZURE_OPENAI_KEY")
if not graph_token:
    missing_credentials.append("GRAPH_ACCESS_TOKEN")

if missing_credentials:
    print(f"WARNING: Missing credentials: {', '.join(missing_credentials)}")
    print("The calendar agent may not function correctly without these credentials.")
    # Continue execution but with limited functionality

# Initialize kernel
kernel = Kernel()
from azure.core.credentials import AzureKeyCredential

# Try to create the service, but with better error handling
try:
    az_service = AzureChatCompletion(
        service_id="chat",
        api_key=openai_key,
        endpoint=openai_endpoint,
        deployment_name=deployment_name,
        api_version="2024-12-01-preview"
    )
    kernel.add_service(az_service)
except Exception as e:
    print(f"Error initializing Azure ChatCompletion: {str(e)}")
    print("The calendar agent may not function correctly.")
    # Define a minimal az_service for graceful degradation
    class MockService:
        async def invoke_chat(self, *args, **kwargs):
            return {"content": "Sorry, I couldn't connect to Azure OpenAI. Please check your credentials."}
    az_service = MockService()


class CalendarSkill:
    @kernel_function(name="create_event", description="Create a calendar event via Microsoft Graph API.")
    async def create_event(self, subject: str, start: str, end: str) -> str:
        if not graph_token:
            return "Unable to create event: Missing Graph API token"
        
        try:
            body = {"subject": subject, "start": {"dateTime": start, "timeZone": "UTC"}, "end": {"dateTime": end, "timeZone": "UTC"}}
            r = requests.post(
                "https://graph.microsoft.com/v1.0/me/events",
                headers={"Authorization": f"Bearer {graph_token}", "Content-Type": "application/json"},
                json=body
            )
            r.raise_for_status()
            return f"Scheduled '{subject}' from {start} to {end}."
        except Exception as e:
            return f"Failed to create event: {str(e)}"

    @kernel_function(name="find_free_slots", description="Find free calendar slots via Microsoft Graph API.")
    async def find_free_slots(self, start_range: str, end_range: str, duration_minutes: int = 30) -> str:
        req = {"schedules": ["me"], "startTime": {"dateTime": start_range, "timeZone": "UTC"},
               "endTime": {"dateTime": end_range, "timeZone": "UTC"}, "availabilityViewInterval": duration_minutes}
        r = requests.post(
            "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
            headers={"Authorization": f"Bearer {graph_token}", "Content-Type": "application/json"},
            json=req
        )
        r.raise_for_status()
        data = r.json().get("value", [])
        slots = []
        base = datetime.fromisoformat(start_range)
        for sched in data:
            view = sched.get("availabilityView", "")
            for i, c in enumerate(view):
                if c == '0':
                    s = base + timedelta(minutes=i * duration_minutes)
                    e = s + timedelta(minutes=duration_minutes)
                    slots.append(f"{s.isoformat()} to {e.isoformat()}")
        return ("Free slots:\n" + "\n".join(slots)) if slots else "No free slots found."
    
    @kernel_function(
        name="cancel_events",
        description=(
            "Cancel (delete) calendar events by name and/or time range. "
            "Provide a subject substring (optional) and/or a start/end UTC ISO window."
        )
    )
    async def cancel_events(
        self,
        start_range: str,
        end_range: str,
        subject: Optional[str] = None
    ) -> str:
        """
        subject: substring to match in the event subject (or empty to delete all in the window)
        start_range, end_range: ISO strings in UTC, e.g. "2025-05-14T00:00:00Z"
        """
        params = {
            "startDateTime": start_range,
            "endDateTime":   end_range,
            "$orderby":      "start/dateTime"
        }
        r = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView",
            headers={
                "Authorization": f"Bearer {graph_token}",
                "Content-Type":  "application/json"
            },
            params=params
        )
        r.raise_for_status()
        events = r.json().get("value", [])
        if not events:
            return "No events found in that time range."

        matches = []
        for ev in events:
            subj = ev.get("subject", "")
            if subject:
                if subject.lower() in subj.lower():
                    matches.append(ev)
            else:
                matches.append(ev)

        if not matches:
            return f"No events matching '{subject}' found between {start_range} and {end_range}."

        deleted: List[str] = []
        for ev in matches:
            ev_id = ev["id"]
            # also pull local time for confirmation
            start_utc = parser.isoparse(ev["start"]["dateTime"]).replace(tzinfo=timezone.utc)
            london = tz.gettz("Europe/London")
            start_loc = start_utc.astimezone(london).strftime("%Y-%m-%d %H:%M")
            subj = ev.get("subject", "(no subject)")
            resp = requests.delete(
                f"https://graph.microsoft.com/v1.0/me/events/{ev_id}",
                headers={"Authorization": f"Bearer {graph_token}"}
            )
            if resp.status_code == 204:
                deleted.append(f"'{subj}' at {start_loc}")
            else:
                resp.raise_for_status()

        lines = ["Deleted the following events:"]
        lines += [f"- {d}" for d in deleted]
        return "\n".join(lines)
    
    @kernel_function(
        name="report_schedule",
        description="List all calendar events in the given range, reporting subject and London-time start/end."
    )
    async def report_schedule(self, start_range: str, end_range: str) -> str:
        """
        start_range, end_range: ISO strings in UTC, e.g. "2025-05-14T00:00:00Z"
        """
        if not graph_token:
            return "Unable to report schedule: Missing Graph API token"
            
        try:
            params = {
                "startDateTime": start_range,
                "endDateTime":   end_range,
                "$orderby":      "start/dateTime"
            }
            r = requests.get(
                "https://graph.microsoft.com/v1.0/me/calendarView",
                headers={
                    "Authorization": f"Bearer {graph_token}",
                    "Content-Type": "application/json"
                },
                params=params
            )
            r.raise_for_status()
            events = r.json().get("value", [])
            if not events:
                return "You have no events in that time range."

            london = tz.gettz("Europe/London")
            lines = ["Your events:"]
            for ev in events:
                subj = ev.get("subject", "(no subject)")
                start_utc = datetime.fromisoformat(ev["start"]["dateTime"]).replace(tzinfo=timezone.utc)
                end_utc   = datetime.fromisoformat(ev["end"]["dateTime"]).replace(tzinfo=timezone.utc)
                start_loc = start_utc.astimezone(london).strftime("%Y-%m-%d %H:%M")
                end_loc   = end_utc.astimezone(london).strftime("%Y-%m-%d %H:%M")
                lines.append(f"- {subj}: {start_loc} to {end_loc} (London time)")

            return "\n".join(lines)
        except Exception as e:
            return f"Failed to retrieve calendar: {str(e)}"
    
    @kernel_function(
        name="send_message",
        description=(
            "Send an arbitrary text message to either a Teams user (1:1) or an existing group chat, "
            "by display name or chat topic. If you pass an email address it will do GET /users/{email}. "
            "Requires ChatMessage.Send and Chat.ReadWrite."
        )
    )
    async def send_message(
        self,
        recipient_name: str,
        message: str
    ) -> str:
        # 1) Resolve chat_id
        if "@" in recipient_name:
            # Email → direct GET
            usr_resp = requests.get(
                f"https://graph.microsoft.com/v1.0/users/{recipient_name}",
                headers={
                    "Authorization": f"Bearer {graph_token}",
                    "Content-Type": "application/json"
                }
            )
            if usr_resp.status_code == 404:
                return f"❌ No user found with email '{recipient_name}'."
            usr_resp.raise_for_status()
            user_id = usr_resp.json()["id"]

            # Create or get 1:1 chat
            chat_payload = {
                "chatType": "oneOnOne",
                "members": [
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        "roles": [],
                        "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{user_id}')"
                    },
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        "roles": [],
                        "user@odata.bind": "https://graph.microsoft.com/v1.0/me"
                    }
                ]
            }
            chat_resp = requests.post(
                "https://graph.microsoft.com/v1.0/chats",
                headers={
                    "Authorization": f"Bearer {graph_token}",
                    "Content-Type": "application/json"
                },
                json=chat_payload
            )
            chat_resp.raise_for_status()
            chat_id = chat_resp.json()["id"]

        else:
            # Try displayName lookup
            usr_resp = requests.get(
                "https://graph.microsoft.com/v1.0/users",
                headers={
                    "Authorization": f"Bearer {graph_token}",
                    "Content-Type": "application/json"
                },
                params={"$filter": f"displayName eq '{recipient_name}'"}
            )
            usr_resp.raise_for_status()
            users = usr_resp.json().get("value", [])
            if users:
                user_id = users[0]["id"]
                # Create or get 1:1 chat
                chat_payload = {
                    "chatType": "oneOnOne",
                    "members": [
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": [],
                            "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{user_id}')"
                        },
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": [],
                            "user@odata.bind": "https://graph.microsoft.com/v1.0/me"
                        }
                    ]
                }
                chat_resp = requests.post(
                    "https://graph.microsoft.com/v1.0/chats",
                    headers={
                        "Authorization": f"Bearer {graph_token}",
                        "Content-Type": "application/json"
                    },
                    json=chat_payload
                )
                chat_resp.raise_for_status()
                chat_id = chat_resp.json()["id"]
            else:
                # Fallback: find existing group chat by topic
                chat_list = requests.get(
                    "https://graph.microsoft.com/v1.0/me/chats",
                    headers={
                        "Authorization": f"Bearer {graph_token}",
                        "Content-Type": "application/json"
                    }
                )
                chat_list.raise_for_status()
                chats = chat_list.json().get("value", [])
                match = next(
                    (c for c in chats if c.get("topic", "").lower() == recipient_name.lower()),
                    None
                )
                if not match:
                    return f"❌ No user or group chat found named '{recipient_name}'."
                chat_id = match["id"]

        # 2) Send the message
        send_resp = requests.post(
            f"https://graph.microsoft.com/v1.0/chats/{chat_id}/messages",
            headers={
                "Authorization": f"Bearer {graph_token}",
                "Content-Type": "application/json"
            },
            json={
                "body": {
                    "contentType": "text",
                    "content": message
                }
            }
        )
        send_resp.raise_for_status()
        return f"✅ Message sent to **{recipient_name}**."


calendar_skill = CalendarSkill()
kernel.add_plugin(calendar_skill)

try:
    agent = ChatCompletionAgent(
        kernel=kernel,
        name="CalendarAgent",
        instructions=(
            f"Current UTC time: {datetime.now(timezone.utc).isoformat()}\n"
            "You are a helpful assistant that can schedule or cancel calendar events, report schedule, send a custom Teams chat message to a user or group chat by name (send_message_to_user) on UK london time. "
            "Use the function calling capability to invoke create_event or find_free_slots as needed."
            "If the calendar service is unavailable, politely inform the user."
        ),
        service=az_service,
        plugins=[calendar_skill]
    )
except Exception as e:
    print(f"Error creating ChatCompletionAgent: {str(e)}")
    # Create a simple mock agent for graceful degradation
    class MockAgent:
        async def invoke(self, messages):
            yield type('obj', (object,), {'content': "I'm sorry, I couldn't connect to the calendar service. Please check your API credentials and try again later."})
    
    agent = MockAgent()

async def main():
    print("Enter a calendar request or 'exit' to quit:")
    while True:
        try:
            user_req = input("> ")
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break
        if user_req.lower() in ("exit", "quit"):
            print("Goodbye!")
            break


        async for response in agent.invoke(messages=user_req):
            print(response.content)

if __name__ == "__main__":
    asyncio.run(main())
