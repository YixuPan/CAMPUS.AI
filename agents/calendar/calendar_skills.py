import os
import requests
import asyncio
from typing import Optional, List, Dict, Any

from dateutil import parser, tz
from datetime import datetime, timedelta, timezone
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent


class CalendarSkill:
    def __init__(self, graph_token: Optional[str]):
        if not graph_token:
            raise ValueError("GRAPH_ACCESS_TOKEN is required for CalendarSkill.")
        self.graph_token = graph_token

    @kernel_function(name="create_event", description="Create a calendar event via Microsoft Graph API.")
    async def create_event(self, subject: str, start: str, end: str) -> str:
        body = {"subject": subject, "start": {"dateTime": start, "timeZone": "UTC"}, "end": {"dateTime": end, "timeZone": "UTC"}}
        r = requests.post(
            "https://graph.microsoft.com/v1.0/me/events",
            headers={"Authorization": f"Bearer {self.graph_token}", "Content-Type": "application/json"},
            json=body
        )
        r.raise_for_status()
        return f"Scheduled '{subject}' from {start} to {end}."

    @kernel_function(name="find_free_slots", description="Find free calendar slots via Microsoft Graph API.")
    async def find_free_slots(self, start_range: str, end_range: str, duration_minutes: int = 30) -> str:
        req = {"schedules": ["me"], "startTime": {"dateTime": start_range, "timeZone": "UTC"},
               "endTime": {"dateTime": end_range, "timeZone": "UTC"}, "availabilityViewInterval": duration_minutes}
        r = requests.post(
            "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
            headers={"Authorization": f"Bearer {self.graph_token}", "Content-Type": "application/json"},
            json=req
        )
        r.raise_for_status()
        data = r.json().get("value", [])
        slots = []
        # Ensure start_range is parsed correctly for base datetime
        try:
            base = datetime.fromisoformat(start_range.replace("Z", "+00:00")) # Handle Z for UTC
        except ValueError:
             # Fallback if parsing fails, assuming it might be a different but valid ISO format
            base = parser.isoparse(start_range)
        
        if base.tzinfo is None: # Ensure timezone awareness
            base = base.replace(tzinfo=timezone.utc)

        for sched in data:
            view = sched.get("availabilityView", "")
            for i, c in enumerate(view):
                if c == '0': # '0' indicates free
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
        params = {
            "startDateTime": start_range,
            "endDateTime":   end_range,
            "$orderby":      "start/dateTime"
        }
        r = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView",
            headers={"Authorization": f"Bearer {self.graph_token}", "Content-Type": "application/json"},
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
            return f"No events matching \"{subject}\" found between {start_range} and {end_range}."

        deleted: List[str] = []
        for ev in matches:
            ev_id = ev["id"]
            start_utc = parser.isoparse(ev["start"]["dateTime"]).replace(tzinfo=timezone.utc)
            london_tz = tz.gettz("Europe/London") # Corrected: tz.gettz()
            start_loc = start_utc.astimezone(london_tz).strftime("%Y-%m-%d %H:%M")
            subj = ev.get("subject", "(no subject)")
            resp = requests.delete(
                f"https://graph.microsoft.com/v1.0/me/events/{ev_id}",
                headers={"Authorization": f"Bearer {self.graph_token}"}
            )
            if resp.status_code == 204:
                deleted.append(f"\"{subj}\" at {start_loc}")
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
        params = {
            "startDateTime": start_range,
            "endDateTime":   end_range,
            "$orderby":      "start/dateTime"
        }
        r = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView",
            headers={"Authorization": f"Bearer {self.graph_token}", "Content-Type": "application/json"},
            params=params
        )
        r.raise_for_status()
        events = r.json().get("value", [])
        if not events:
            return "You have no events in that time range."

        london_tz = tz.gettz("Europe/London") # Corrected: tz.gettz()
        lines = ["Your events:"]
        for ev in events:
            subj = ev.get("subject", "(no subject)")
            start_utc = parser.isoparse(ev["start"]["dateTime"]).replace(tzinfo=timezone.utc) # Ensure UTC
            end_utc   = parser.isoparse(ev["end"]["dateTime"]).replace(tzinfo=timezone.utc)   # Ensure UTC
            start_loc = start_utc.astimezone(london_tz).strftime("%Y-%m-%d %H:%M")
            end_loc   = end_utc.astimezone(london_tz).strftime("%Y-%m-%d %H:%M")
            lines.append(f"- {subj}: {start_loc} to {end_loc} (London time)")

        return "\n".join(lines)
