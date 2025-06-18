#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AbyssalSecurity Client Portal Quick Start${NC}"
echo "=========================================================="

# Kill any existing processes
echo -e "${YELLOW}🔧 Cleaning up existing processes...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd server && npm install && cd ..
fi

# Start backend server
echo -e "${YELLOW}🔧 Starting backend server...${NC}"
cd server && npm run dev &
SERVER_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server  
echo -e "${YELLOW}🌐 Starting frontend server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ Development servers started!${NC}"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"
echo ""
echo -e "${BLUE}🛠️ Features Available:${NC}"
echo "   - User Registration & Login"
echo "   - JWT Authentication"
echo "   - Profile Management"
echo "   - In-memory data storage (demo mode)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on script termination
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping servers...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Wait for both background processes
wait