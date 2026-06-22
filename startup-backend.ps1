$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$pythonLauncher = 'py -3.13'
$workerProcess = $null

Write-Host 'Preparing backend environment...'
Push-Location $backendPath
try {
    if (-not (Test-Path '.venv\Scripts\python.exe')) {
        Invoke-Expression "$pythonLauncher -m venv .venv"
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

Write-Host 'Starting worker in a separate window...'
$workerCmd = "`$env:PYTHONPATH='$backendPath'; Set-Location '$backendPath'; Write-Host 'Worker launcher waiting for backend...'; while (`$true) { try { `$resp = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8000/health/ready' -TimeoutSec 2; if (`$resp.StatusCode -eq 200) { break } } catch { } }; Write-Host 'Backend is ready. Starting worker...'; & '.\.venv\Scripts\python.exe' -m app.worker"
$workerProcess = Start-Process pwsh -ArgumentList '-NoExit', '-Command', $workerCmd -PassThru

Write-Host 'Clearing port 8000...'
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Write-Host 'Starting backend API in this window...'
Write-Host 'Backend: http://localhost:8000'
Write-Host 'Access logs are enabled. You will see API requests here.'

try {
    $env:PYTHONPATH = $backendPath
    Set-Location $root
    & "$backendPath\.venv\Scripts\uvicorn.exe" backend.app.main:app --host 0.0.0.0 --port 8000 --log-level info --access-log
}
finally {
    if ($workerProcess -and -not $workerProcess.HasExited) {
        Write-Host 'Stopping worker process...'
        Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
