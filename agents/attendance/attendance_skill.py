from azure.cosmos import CosmosClient, exceptions as cosmos_exceptions
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from datetime import datetime, timezone
import uuid
from typing import Optional

# --- AttendanceSkill Plugin ---
class AttendanceSkill:
    def __init__(self, cosmos_client: CosmosClient, db_name: str, container_name: str):
        self.container = cosmos_client.get_database_client(db_name).get_container_client(container_name)

    @kernel_function(name="check_in_event", description="Store a check-in event in Cosmos DB.")
    def check_in_event(self, user_id: str, event_name: str) -> str:
        item = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "event_name": event_name,
            "checked_in": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        try:
            self.container.create_item(body=item)
            return f"Check-in successful for event '{event_name}'."
        except cosmos_exceptions.CosmosHttpResponseError as e:
            print(f"[AttendanceSkill] Cosmos DB error: {e}")
            return "Error: Could not store the check-in record."

    @kernel_function(name="query_attendance", description="Query attendance records from Cosmos DB.")
    def query_attendance(self, user_id: str, event_name: Optional[str] = None) -> str:
        try:
            if event_name:
                query = "SELECT * FROM c WHERE c.user_id=@uid AND LOWER(c.event_name)=LOWER(@ename) AND c.checked_in=true"
                params = [{"name": "@uid", "value": user_id}, {"name": "@ename", "value": event_name}]
            else:
                query = "SELECT * FROM c WHERE c.user_id=@uid AND c.checked_in=true"
                params = [{"name": "@uid", "value": user_id}]

            items = list(self.container.query_items(
                query=query,
                parameters=params,
                enable_cross_partition_query=True
            ))

            if not items:
                return f"No attendance records found{f' for {event_name}' if event_name else ''}."
            if event_name:
                return f"Yes, you have checked in to {event_name}."
            else:
                events = [item["event_name"] for item in items]
                return "You checked in to: " + ", ".join(events)
        except cosmos_exceptions.CosmosHttpResponseError as e:
            print(f"[AttendanceSkill] Cosmos DB error: {e}")
            return "Error: Could not query attendance records."


