from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import calendar_agent
import json
import traceback
import sys
import requests
from datetime import datetime, timedelta
from typing import List, Optional
from dateutil import parser

app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class Event(BaseModel):
    id: str
    title: str
    description: str
    start: str  # ISO string
    end: str    # ISO string
    category: str

@app.get("/health")
async def health_check():
    """Simple endpoint to check if the API server is running."""
    return {"status": "ok", "message": "Calendar API server is running"}

@app.get("/calendar/events")
async def get_calendar_events(start_date: str, end_date: str):
    """
    Get calendar events from Microsoft Graph API.
    start_date and end_date should be ISO format strings (e.g. "2023-05-01T00:00:00Z")
    """
    try:
        # Get the Graph token from the calendar_agent
        graph_token = calendar_agent.graph_token
        
        if not graph_token:
            raise HTTPException(status_code=401, detail="Graph API token not available")
            
        # Set up the request to MS Graph API
        params = {
            "startDateTime": start_date,
            "endDateTime": end_date,
            "$orderby": "start/dateTime"
        }
        
        # Make the API call
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView",
            headers={
                "Authorization": f"Bearer {graph_token}",
                "Content-Type": "application/json"
            },
            params=params
        )
        
        # Check if the request was successful
        response.raise_for_status()
        
        # Parse the response
        ms_events = response.json().get("value", [])
        
        # Transform to our event model
        events = []
        for ev in ms_events:
            category = "meeting"  # Default category
            
            # Try to determine category based on keywords in subject or body
            subject_lower = ev.get("subject", "").lower()
            body_lower = ev.get("bodyPreview", "").lower()
            
            if "task" in subject_lower or "todo" in subject_lower or "deadline" in subject_lower:
                category = "task"
            elif "reminder" in subject_lower or "remember" in subject_lower:
                category = "reminder"
            elif "lunch" in subject_lower or "dinner" in subject_lower or "coffee" in subject_lower or "social" in subject_lower:
                category = "social"
                
            # Create our event object
            event = Event(
                id=ev.get("id", ""),
                title=ev.get("subject", "(No title)"),
                description=ev.get("bodyPreview", ""),
                start=ev.get("start", {}).get("dateTime", ""),
                end=ev.get("end", {}).get("dateTime", ""),
                category=category
            )
            events.append(event)
            
        return {"events": events}
        
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"Error fetching calendar events: {str(e)}\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"Error fetching calendar events: {str(e)}")

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        print(f"Received message: {request.message}")
        
        # Use a single concatenated string instead of a list
        full_response = ""
        
        # Use a timeout to avoid hanging if the calendar agent doesn't respond
        try:
            async for response in calendar_agent.agent.invoke(messages=request.message):
                # Print the type of response for debugging
                print(f"Response type: {type(response)}")
                
                # Extract string content in the most robust way possible
                try:
                    if hasattr(response, 'content'):
                        content = response.content
                        # Handle both string and non-string content
                        content_str = content if isinstance(content, str) else str(content)
                    else:
                        content_str = str(response)
                        
                    print(f"Agent response: {content_str}")
                    full_response += content_str
                except Exception as content_error:
                    print(f"Error extracting content: {str(content_error)}")
                    full_response += "Error extracting response content. "
                    
        except Exception as inner_e:
            error_detail = traceback.format_exc()
            print(f"Error during agent invocation: {str(inner_e)}\n{error_detail}")
            return {"response": f"Sorry, I encountered an error while processing your request: {str(inner_e)}"}
        
        if not full_response:
            return {"response": "I didn't receive a response from the calendar agent. There might be an issue with the service."}
        
        print(f"Final response: {full_response}")
        return {"response": full_response}
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"Error processing request: {str(e)}\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Print some debug info at startup
    print(f"Python version: {sys.version}")
    print(f"Starting calendar API server...")
    
    uvicorn.run(app, host="0.0.0.0", port=9000) 