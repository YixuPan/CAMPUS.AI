# Define ports
FLASK_PORT=9001
UI_PORT=5184

echo "Attempting to free up ports..."

# Kill processes using the Flask port
if fuser -n tcp "${FLASK_PORT}" &>/dev/null; then
    echo "Flask port ${FLASK_PORT} is in use. Attempting to kill process..."
    fuser -k -n tcp "${FLASK_PORT}"
    sleep 1 # Give a moment for the process to terminate
    if fuser -n tcp "${FLASK_PORT}" &>/dev/null; then
        echo "WARNING: Failed to kill process on Flask port ${FLASK_PORT}. Manual intervention may be required."
    else
        echo "Process on Flask port ${FLASK_PORT} killed."
    fi
else
    echo "Flask port ${FLASK_PORT} is free."
fi

# Kill processes using the UI port
if [ "${UI_PORT}" != "YOUR_UI_PORT_HERE" ]; then
    if fuser -n tcp "${UI_PORT}" &>/dev/null; then
        echo "UI port ${UI_PORT} is in use. Attempting to kill process..."
        fuser -k -n tcp "${UI_PORT}"
        sleep 1 # Give a moment for the process to terminate
        if fuser -n tcp "${UI_PORT}" &>/dev/null; then
            echo "WARNING: Failed to kill process on UI port ${UI_PORT}. Manual intervention may be required."
        else
            echo "Process on UI port ${UI_PORT} killed."
        fi
    else
        echo "UI port ${UI_PORT} is free."
    fi
else
    echo "UI_PORT is not set. Skipping attempt to kill process on UI port."
    echo "Please set UI_PORT at the top of this script."
fi

echo ""
# Launch the UI
cd ui
./launch_ui.sh

echo "UI launched"

# Launch the flask backend 
cd ../
python3 app.py >> ./ui/run_log.txt 2>&1 &
echo "Flask backend launched"
echo "Check ./ui/run_log.txt for more details"
