#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AbyssalSecurity Client Portal Development Environment v2.0${NC}"
echo "=============================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Kill any existing processes on ports 3001 and 8080
echo -e "${YELLOW}🔧 Cleaning up existing processes...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2

# Check and install server dependencies
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
    cd server && npm install && cd ..
fi

# Check and install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Setup database if needed
cd server
if [ ! -f "database.sqlite" ]; then
    echo -e "${YELLOW}🗄️ Setting up database...${NC}"
    npm run db:generate
    npm run db:migrate
fi

# Start TypeScript backend server
echo -e "${YELLOW}🔧 Starting TypeScript backend server...${NC}"
npm run dev &
SERVER_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend development server  
echo -e "${YELLOW}🌐 Starting frontend development server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for both servers to start
sleep 5

echo ""
echo -e "${GREEN}✅ Development servers started!${NC}"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001 (TypeScript)"
echo "   Health Check: http://localhost:3001/health"
echo "   API Documentation: http://localhost:3001/api"
echo ""
echo -e "${BLUE}🛠️ Available commands:${NC}"
echo "   Database Studio: cd server && npm run db:studio"
echo "   Run Tests: cd server && npm test"
echo "   Lint Code: cd server && npm run lint"
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