#!/bin/bash

# Start Development Environment for AbyssalSecurity Client Portal

echo "🚀 Starting AbyssalSecurity Client Portal Development Environment"
echo "=============================================================="

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🔧 Starting backend server..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

echo "🌐 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'echo "Stopping servers..."; kill $SERVER_PID $FRONTEND_PID; exit' INT
wait