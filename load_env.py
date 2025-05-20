import os
import re

def load_env():
    """Load environment variables from .env file"""
    try:
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Parse key=value pairs
                match = re.match(r'^([A-Za-z0-9_]+)=(.*)$', line)
                if match:
                    key = match.group(1)
                    value = match.group(2)
                    os.environ[key] = value
        return True
    except FileNotFoundError:
        print("Warning: .env file not found")
        return False

# Load environment variables when imported
load_env()

if __name__ == "__main__":
    print("Environment variables loaded from .env file")
    # Print keys but not values for security
    print("Available keys:", [key for key in os.environ.keys() if key in ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_KEY", "AZURE_OPENAI_DEPLOYMENT_NAME", "GRAPH_ACCESS_TOKEN"]]) 