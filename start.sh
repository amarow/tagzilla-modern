#!/bin/bash
echo "Starting Scrinia..."

# Start Backend
echo "Starting Backend on port 3001..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo "Both services started."
echo "Backend PID: $SERVER_PID"
echo "Frontend PID: $CLIENT_PID"
echo "Press CTRL+C to stop both."

trap "kill $SERVER_PID $CLIENT_PID; exit" SIGINT

wait