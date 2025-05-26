# Launch the UI
cd ui
./launch_ui.sh

echo "UI launched"

# Launch the flask backend 

python3 app.py >> run_log.txt 2>&1 &
echo "Flask backend launched"
echo "Check ./ui/run_log.txt for more details"
