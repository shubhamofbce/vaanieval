$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$pythonPath = 'py -3.13'

Write-Host 'Preparing backend environment...'
Push-Location $backendPath
try {
    if (-not (Test-Path '.venv\Scripts\python.exe')) {
        Invoke-Expression "$pythonPath -m venv .venv"
    }

    & '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt

    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
    }

    Write-Host 'Running migrations...'
    & '.\.venv\Scripts\alembic.exe' upgrade head
}
finally {
    Pop-Location
}

Write-Host 'Preparing frontend environment...'
Push-Location $frontendPath
try {
    & npm install
}
finally {
    Pop-Location
}

Write-Host 'Starting backend API, backend worker, and frontend dev server...'

Write-Host 'Clearing ports 8000 and 5173...'
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$apiCmd = "`$env:PYTHONPATH='$backendPath'; Set-Location '$root'; & '$backendPath\.venv\Scripts\uvicorn.exe' backend.app.main:app --host 0.0.0.0 --port 8000 --log-level info --access-log"
$workerCmd = "`$env:PYTHONPATH='$backendPath'; Set-Location '$backendPath'; .\.venv\Scripts\python.exe -m app.worker"
$frontendCmd = "Set-Location '$frontendPath'; npm run dev"

Start-Process pwsh -ArgumentList '-NoExit', '-Command', $apiCmd
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $workerCmd
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $frontendCmd

Write-Host 'Services launched.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend:  http://localhost:8000'
