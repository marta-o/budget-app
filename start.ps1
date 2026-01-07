# Budget App - Startup Script

Write-Host "Budget App - Starting..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".\backend") -or -not (Test-Path ".\frontend")) {
    Write-Host "ERROR: Uruchom skrypt z root folderu projektu!" -ForegroundColor Red
    exit 1
}

# Backend
Write-Host "Starting backend (uvicorn)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList {
    Set-Location backend
    python -m venv env_budget 2>$null
    .\env_budget\Scripts\Activate.ps1
    uvicorn app.main:app --reload
} -NoNewWindow

Start-Sleep -Seconds 2

# Frontend
Write-Host "Starting frontend (npm run dev)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList {
    Set-Location frontend
    npm run dev
} -NoNewWindow

Write-Host ""
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to quit" -ForegroundColor Gray
