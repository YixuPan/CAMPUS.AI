# Smart-Campus-Management-System-Microsoft-Azure

## Installation
Install dependencies with 
```
pip install -r requirements.txt
```

Additionally, you may need to install `npm`

## Launch
Launch UI + flask backend with

```
# Add execute permissions to script
chmod +x ./launch_app.sh

# Launches both UI and backend -> results in ./ui/run_log.txt
./launch_app.sh

# Launch only UI
cd ./ui
./launc_ui.sh

#Launch only backend
cd ./ui
python app.py
```


## UI
Additional UI instructions [here](./ui/README.md)