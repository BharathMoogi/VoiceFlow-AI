@echo off
echo Starting local development servers...

:: Start the FastAPI backend in a new window
start "FastAPI Backend" cmd /c "cd /d %~dp0 && call venv\Scripts\activate && uvicorn app.main:app --reload"

:: Start the Next.js frontend in a new window
start "Next.js Frontend" cmd /c "cd /d %~dp0\frontend && set NODE_OPTIONS=--use-system-ca && set NODE_TLS_REJECT_UNAUTHORIZED=0 && npm run dev"

echo ---------------------------------------------------
echo Development servers are starting in separate windows!
echo - Backend API will be available at: http://localhost:8000
echo - Frontend App will be available at: http://localhost:3000
echo.
echo Whenever you make code changes, the servers will automatically reload instantly.
echo You don't need to deploy to test your changes anymore!
echo ---------------------------------------------------
pause
