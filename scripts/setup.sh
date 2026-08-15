#!/bin/bash
# ── Sarthi Kalyan — Quick Start (No Docker Required) ──
# Works on Mac, Linux, and Windows (Git Bash/WSL2)
# Requires: Python 3.11+, Node.js 18+, npm

set -e

echo "🇮🇳 Sarthi Kalyan — Setting up..."

# Backend
echo ""
echo "═══ Backend Setup ═══"
cd backend

if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || echo "GEMINI_API_KEY=your_key_here" > .env
  echo "⚠️  Created backend/.env — please add your GEMINI_API_KEY"
fi

python3 -m venv .venv 2>/dev/null || python -m venv .venv
source .venv/bin/activate 2>/dev/null || .venv/Scripts/activate 2>/dev/null
pip install -r requirements.txt --quiet

echo "✅ Backend dependencies installed"
echo "   Starting backend on http://localhost:8000 ..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
echo ""
echo "═══ Frontend Setup ═══"
npm install --silent
echo "✅ Frontend dependencies installed"
echo "   Starting frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo "🚀 Sarthi Kalyan is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Admin:    http://localhost:3000/admin"
echo "════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
