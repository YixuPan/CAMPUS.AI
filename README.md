# CAMPUS.AI

A modern calendar and scheduling application with a beautiful 3D interface and Python backend.

## Project Overview

CAMPUS.AI combines a sleek React frontend with a powerful Python backend to create an intuitive calendar experience.

## Project Structure

- `ui/`: React frontend with 3D carousel interface
- `*.py`: Python backend files for calendar management 

## Getting Started

### Frontend Development

```bash
cd ui
npm install
npm run dev
```

### Backend Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the API server
python calendar_api.py
```

## Features

- Beautiful 3D calendar interface
- Event management and scheduling
- Responsive design

## Technology Stack

- Frontend: React, TypeScript, Three.js, Vite
- Backend: Python, Flask 

## Environment Setup

This project uses environment variables for API keys and other sensitive information. These are stored in a `.env` file which is not committed to the repository.

To set up your environment:

1. Create a `.env` file in the project root with the following variables:
   ```
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=your_endpoint_here
   AZURE_OPENAI_KEY=your_api_key_here
   AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

   # Microsoft Graph API Token
   GRAPH_ACCESS_TOKEN=your_graph_token_here
   ```

2. The application will automatically load these variables when started.

Note: The `.env` file is included in `.gitignore` to prevent committing sensitive information to the repository. 