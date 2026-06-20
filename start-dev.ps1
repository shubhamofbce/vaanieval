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

$apiCmd = "Set-Location '$backendPath'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
$workerCmd = "Set-Location '$backendPath'; .\.venv\Scripts\python.exe -m app.worker"
$frontendCmd = "Set-Location '$frontendPath'; npx vite --host 0.0.0.0 --port 5173"

Start-Process pwsh -ArgumentList '-NoExit', '-Command', $apiCmd
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $workerCmd
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $frontendCmd

Write-Host 'Services launched.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend:  http://localhost:8000'
