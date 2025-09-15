#!/bin/bash

# Castle Fine Art Event System Startup Script
echo "🏰 Starting Castle Fine Art Event Management System..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run this first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install flask flask-cors requests configparser"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if required Python packages are installed
echo "📦 Checking dependencies..."
python3 -c "import flask, flask_cors, requests, configparser, jwt, cryptography, google.auth" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing dependencies. Installing..."
    pip install flask flask-cors requests configparser pyjwt cryptography google-auth google-auth-oauthlib google-auth-httplib2
fi

# Start the backend server
echo "🚀 Starting backend server on port 5001..."
echo "   Backend URL: http://localhost:5001"
echo "   Press Ctrl+C to stop the server"
echo ""

# Run the server
python3 workflow_coordinator.py

echo ""
echo "🛑 Backend server stopped."