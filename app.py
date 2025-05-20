from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({
        "message": "CAMPUS.AI API is running",
        "status": "OK"
    })

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "version": "1.0.0"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port) 