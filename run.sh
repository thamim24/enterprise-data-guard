#!/bin/bash

echo "🚀 Starting Enterprise Data Guard System"
echo "========================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Setup backend
echo "📦 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Initialize database
echo "Initializing database..."
python db.py

# Start backend server in background
echo "🖥️  Starting backend server on http://localhost:8000"
python app.py &
BACKEND_PID=$!

# Setup frontend
echo "📦 Setting up frontend..."
cd ../frontend

# Install Node.js dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Start frontend server
echo "🌐 Starting frontend server on http://localhost:3000"
npm start &
FRONTEND_PID=$!

# Wait for servers to start
sleep 3

echo ""
echo "✅ System started successfully!"
echo "==============================="
echo "🖥️  Backend API: http://localhost:8000"
echo "🌐 Frontend App: http://localhost:3000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Demo Login Credentials:"
echo "👨‍💼 Admin: admin / admin123"
echo "👤 HR User: john_hr / password123"
echo "👤 Finance User: sarah_finance / password123"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All servers stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop the script
wait