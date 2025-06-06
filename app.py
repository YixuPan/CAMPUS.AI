from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import asyncio
import json
import sys
import calendar
from datetime import datetime
from dotenv import load_dotenv
import requests

# Add the project directory and triagespeech1 folder to the Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_dir)
# sys.path.append(os.path.join(project_dir, "`triagespeech1`"))
# Add agents directory for direct import
sys.path.append(os.path.join(os.path.dirname(project_dir), "agents"))

# Load environment variables
load_dotenv()

# Print environment variables (redacted for sensitive values)
print("Environment variables loaded:")
print(f"AZURE_OPENAI_API_ENDPOINT: {'[REDACTED]' if os.getenv('AZURE_OPENAI_API_ENDPOINT') else 'Not found'}")
print(f"AZURE_OPENAI_API_KEY: {'[REDACTED]' if os.getenv('AZURE_OPENAI_API_KEY') else 'Not found'}")
print(f"AZURE_OPENAI_CHAT_DEPLOYMENT_NAME: {os.getenv('AZURE_OPENAI_CHAT_DEPLOYMENT_NAME')}")
print(f"AZURE_OPENAI_API_VERSION: {os.getenv('AZURE_OPENAI_API_VERSION')}")
print(f"SPEECH_KEY: {'[REDACTED]' if os.getenv('SPEECH_KEY') else 'Not found'}")
print(f"SPEECH_REGION: {os.getenv('SPEECH_REGION')}")

# Set variables correctly - use chat deployment name for deployment name if needed
if os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"):
    os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"] = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")

# Import the speech recognition functionality
try:
    from agents.speech.speech_io import recognize_from_microphone, speak_text, stop_speech, stop_recognition, speak_text_async, reset_synthesis_flags
    SPEECH_AVAILABLE = True
    print("Speech module imported successfully")
except Exception as e:
    print(f"WARNING: Speech module import failed: {e}")
    print("Ensure agents/speech/speech_io.py exists")
    SPEECH_AVAILABLE = False

# Import agents and ChatMessageContent
try:
    from semantic_kernel.contents import ChatMessageContent
    from agents import CalendarAgent, IoTAgent, SpeechAgent, AttendanceAgent, TriageAgent # Assuming TriageAgent is also in agents
    AGENTS_AVAILABLE = True
    print("All specialized agents and ChatMessageContent imported successfully.")
except ImportError as e:
    print(f"ERROR importing agents or ChatMessageContent: {e}")
    print("Ensure 'agents.py' and necessary Semantic Kernel components are in the PYTHONPATH.")
    AGENTS_AVAILABLE = False
    # Define dummy classes if import fails to avoid NameError later, though functionality will be impaired
    class TriageAgent: pass
    class CalendarAgent: pass
    class IoTAgent: pass
    class SpeechAgent: pass
    class AttendanceAgent: pass
    class ChatMessageContent: pass

# Force production mode - we don't want mock mode
TESTING_MODE = False
try:
    # Create a single instance of the triage agent
    if AGENTS_AVAILABLE:
        triage_agent_instance = TriageAgent(show_thoughts=True, available_agents=[CalendarAgent, IoTAgent, SpeechAgent, AttendanceAgent])
        triage_agent = triage_agent_instance.triage_agent # Assuming TriageAgent class has a .triage_agent attribute that is the invokable agent
        print("Triage Agent initialized successfully!")
    else:
        triage_agent = None
        print("Triage Agent could not be initialized due to missing agent modules.")
except Exception as e:
    print(f"ERROR initializing triage agent: {e}")
    # print("Path issue? Check that triagespeech1/triage_agent.py exists.") # This path might be obsolete
    print("Check TriageAgent class and its dependencies.")
    triage_agent = None # Ensure triage_agent is None if initialization fails

# Create a global variable to track the speech synthesizer
speech_synthesizer = None

# Global conversation history (Note: This is in-memory and shared across all users/requests, and resets on app restart)
conversation_history = []

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint to handle chat messages.
    Uses the triage agent to process messages and get responses.
    """
    global conversation_history # Ensure we're using the global history
    try:
        data = request.json
        message_text = data.get('message', '')
        
        if not message_text:
            return jsonify({"error": "No message provided"}), 400
        
        print(f"Received chat message: {message_text}")
        
        # Add current user message to history before processing
        # The process_message function will format the history for the agent
        # conversation_history.append({"role": "user", "content": message_text}) # This will be handled by process_message now
        
        # Use run_async to call the async function from the synchronous Flask context
        try:
            # Pass the current message and a copy of the history
            response = asyncio.run(process_message(message_text, list(conversation_history)))
            
            # Update history after successful processing
            conversation_history.append({"role": "user", "content": message_text})
            conversation_history.append({"role": "assistant", "content": response})

        except Exception as e:
            print(f"Error processing message with triage agent: {e}")
            response = f"I'm having trouble connecting to my AI services: {str(e)}"
        
        # Trim history if it gets too long to prevent excessive memory usage (optional)
        MAX_HISTORY_LEN = 20 # Keep last 10 turns (20 messages)
        if len(conversation_history) > MAX_HISTORY_LEN:
            conversation_history = conversation_history[-MAX_HISTORY_LEN:]
        
        print(f"Sending response: {response[:100]}..." if len(response) > 100 else f"Sending response: {response}")
        
        return jsonify({"response": response})
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/recognize', methods=['POST'])
def speech_recognize():
    """
    Endpoint to handle speech recognition requests.
    Uses the Azure Cognitive Services to convert speech to text.
    """
    try:
        if not SPEECH_AVAILABLE:
            print("Speech recognition not available - module not loaded")
            return jsonify({"text": "Speech recognition is not available on this server."}), 503
        
        print("Starting speech recognition...")
        text = recognize_from_microphone()
        print(f"Recognized text: {text}")
        
        if text:
            return jsonify({"text": text})
        else:
            return jsonify({"error": "No speech detected"}), 204
    except Exception as e:
        print(f"Error in speech recognition: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Convert text to speech using Azure Text-to-Speech
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        if not text.strip():
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        # Reset stop flag when starting new speech
        reset_synthesis_flags()
        
        # Use the improved async speech function
        result = speak_text_async(text)
        
        return jsonify({'status': 'Speech synthesis started', 'result': result})
        
    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/speech/stop', methods=['POST'])
def speech_stop():
    """
    Endpoint to stop ongoing speech synthesis.
    """
    try:
        if not SPEECH_AVAILABLE:
            print("Speech stop not available - module not loaded")
            return jsonify({"result": "Speech functionality is not available on this server."}), 503
        
        # Call the stop_speech function from speech_io
        result = stop_speech()
        print("Speech stop result:", result)
        return jsonify({"result": result})
    except Exception as e:
        print(f"Error stopping speech: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/stop_recognition', methods=['POST', 'OPTIONS'])
def speech_stop_recognition():
    """
    Endpoint to stop ongoing speech recognition.
    """
    if request.method == 'OPTIONS':
        # Handle CORS preflight
        return jsonify({}), 200
    
    try:
        if not SPEECH_AVAILABLE:
            print("Speech recognition stop not available - module not loaded")
            return jsonify({"result": "Speech functionality is not available on this server."}), 503
        
        # Call the stop_recognition function from speech_io
        result = stop_recognition()
        print("Speech recognition stop result:", result)
        return jsonify({"result": result})
    except Exception as e:
        print(f"Error stopping speech recognition: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/calendar/sync', methods=['GET'])
def calendar_sync():
    """
    Endpoint to synchronize calendar events from Microsoft Graph API.
    Returns calendar events in a format compatible with the UI calendar component.
    """
    try:
        # Get start and end dates from request parameters
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)
        
        print(f"Calendar sync request received for date range: {start_date} to {end_date}")
        
        if not start_date or not end_date:
            # Default to current month if not specified
            today = datetime.now()
            start_date = datetime(today.year, today.month, 1).isoformat()
            last_day = calendar.monthrange(today.year, today.month)[1]
            end_date = datetime(today.year, today.month, last_day).isoformat()
            print(f"Using default date range: {start_date} to {end_date}")
        
        # Get Graph Access Token from environment variables
        graph_token = os.getenv("GRAPH_ACCESS_TOKEN")
        
        if not graph_token:
            print("ERROR: Graph Access Token is not available")
            return jsonify({"error": "Graph Access Token is not available"}), 401
        else:
            print(f"Graph token available, length: {len(graph_token)}")
        
        # Make request to Microsoft Graph API
        params = {
            "startDateTime": start_date,
            "endDateTime": end_date,
            "$orderby": "start/dateTime"
        }
        
        print(f"Making request to Microsoft Graph API with params: {params}")
        
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView",
            headers={
                "Authorization": f"Bearer {graph_token}",
                "Content-Type": "application/json"
            },
            params=params
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse response
        ms_events = response.json().get("value", [])
        
        # Transform to format expected by UI calendar component
        events = []
        for ev in ms_events:
            # Determine category based on keywords
            category = "meeting"  # Default category
            subject_lower = ev.get("subject", "").lower()
            
            if "task" in subject_lower or "todo" in subject_lower:
                category = "task"
            elif "reminder" in subject_lower:
                category = "reminder"
            elif "lunch" in subject_lower or "dinner" in subject_lower or "social" in subject_lower:
                category = "social"
            
            # Format times correctly
            start_time = ev.get("start", {}).get("dateTime", "")
            end_time = ev.get("end", {}).get("dateTime", "")
            
            # Create event object
            event = {
                "id": ev.get("id", ""),
                "title": ev.get("subject", "(No title)"),
                "description": ev.get("bodyPreview", ""),
                "start": start_time,
                "end": end_time,
                "category": category
            }
            events.append(event)
        
        return jsonify({"events": events})
        
    except Exception as e:
        print(f"Error syncing calendar: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/calendar/test', methods=['GET'])
def calendar_test():
    """
    Endpoint to test Microsoft Graph API connectivity.
    Returns information about the current user's calendar if successful.
    """
    try:
        # Get Graph Access Token from environment variables
        graph_token = os.getenv("GRAPH_ACCESS_TOKEN")
        
        if not graph_token:
            return jsonify({
                "status": "error",
                "message": "Graph Access Token is not available",
                "token_available": False
            }), 401
        
        # Test token by making a simple request to get user information
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={
                "Authorization": f"Bearer {graph_token}",
                "Content-Type": "application/json"
            }
        )
        
        # Check if request was successful
        if response.status_code == 200:
            user_data = response.json()
            
            # Also test calendar access
            calendar_response = requests.get(
                "https://graph.microsoft.com/v1.0/me/calendars",
                headers={
                    "Authorization": f"Bearer {graph_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if calendar_response.status_code == 200:
                calendars = calendar_response.json().get("value", [])
                
                return jsonify({
                    "status": "success",
                    "message": "Successfully connected to Microsoft Graph API",
                    "token_available": True,
                    "user": {
                        "displayName": user_data.get("displayName", "Unknown"),
                        "email": user_data.get("mail", user_data.get("userPrincipalName", "Unknown")),
                    },
                    "calendars": {
                        "count": len(calendars),
                        "names": [cal.get("name") for cal in calendars]
                    }
                })
            else:
                return jsonify({
                    "status": "partial_error",
                    "message": f"Connected to Microsoft Graph API but calendar access failed: {calendar_response.status_code} {calendar_response.text}",
                    "token_available": True,
                    "user": {
                        "displayName": user_data.get("displayName", "Unknown"),
                        "email": user_data.get("mail", user_data.get("userPrincipalName", "Unknown")),
                    }
                })
        else:
            return jsonify({
                "status": "error",
                "message": f"Failed to connect to Microsoft Graph API: {response.status_code} {response.text}",
                "token_available": True,
                "token_valid": False
            }), response.status_code
            
    except Exception as e:
        print(f"Error testing calendar API: {e}")
        return jsonify({
            "status": "error",
            "message": f"Error testing calendar API: {str(e)}",
            "token_available": graph_token is not None
        }), 500

async def process_message(current_user_message: str, history: list):
    """
    Process a user message through the triage agent, including conversation history.
    Returns the full response as a string.
    history: A list of dictionaries, e.g., [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    """
    try:
        if triage_agent is not None and AGENTS_AVAILABLE:
            messages_for_agent = []
            # Add historical messages
            for entry in history:
                try:
                    messages_for_agent.append(ChatMessageContent(role=entry["role"], content=entry["content"]))
                except KeyError:
                    print(f"Warning: Skipping history entry due to missing 'role' or 'content': {entry}")
                    continue
            
            # Add current user message
            messages_for_agent.append(ChatMessageContent(role="user", content=current_user_message))

            full_response = []
            async for response_chunk in triage_agent.invoke(messages=messages_for_agent):
                if response_chunk.content:
                    content_str = str(response_chunk.content) if response_chunk.content is not None else ""
                    full_response.append(content_str)
            
            response_text = "".join(full_response)
            return response_text
        elif not AGENTS_AVAILABLE:
            return "The Triage Agent's components are not available. Please check the server configuration."
        else:
            return "The triage agent is not available at the moment. Please try again later."
    except Exception as e:
        print(f"Error processing message: {e}")
        # It's better to re-raise or return a specific error that the calling function can handle
        raise # Re-raise the exception to be caught by the /chat endpoint's error handler

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9001))
    app.run(host="0.0.0.0", port=port, debug=True)