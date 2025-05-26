import json
from semantic_kernel.functions import kernel_function
from azure.cosmos import CosmosClient



class IoTDataSkill:
    def __init__(self, cosmos_connection_string, db_name, container_name):
        self.client = CosmosClient.from_connection_string(cosmos_connection_string)
        self.container = self.client.get_database_client(db_name).get_container_client(container_name)

    @kernel_function(name="get_latest_telemetry", description="Fetch latest IoT sensor readings")
    async def get_latest_telemetry(self):
        query = "SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 10"
        results = list(self.container.query_items(query, enable_cross_partition_query=True))
        return json.dumps(results, indent=2)
