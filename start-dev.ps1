$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$minimumPython = [Version]'3.11'

function Test-SupportedPython {
    param([string[]]$Command)

    try {
        $executable = $Command[0]
        $arguments = @($Command | Select-Object -Skip 1)
        $version = & $executable @arguments -c 'import platform; print(platform.python_version())' 2>$null
        return $LASTEXITCODE -eq 0 -and [Version]$version -ge $minimumPython
    }
    catch {
        return $false
    }
}

function Find-Python {
    $candidates = @(
        @('py', '-3.13'),
        @('py', '-3.12'),
        @('py', '-3.11'),
        @('python', '--')
    )

    foreach ($candidate in $candidates) {
        if (Get-Command $candidate[0] -ErrorAction SilentlyContinue) {
            $command = if ($candidate[1] -eq '--') { @($candidate[0]) } else { $candidate }
            if (Test-SupportedPython $command) {
                return $command
            }
        }
    }

    throw 'Python 3.11 or newer is required. Install it from python.org or with: winget install Python.Python.3.13'
}

$pythonCommand = Find-Python
$pythonExecutable = $pythonCommand[0]
$pythonArguments = @($pythonCommand | Select-Object -Skip 1)

Write-Host 'Preparing backend environment...'
Push-Location $backendPath
try {
    $venvPython = '.\.venv\Scripts\python.exe'
    if ((Test-Path $venvPython) -and -not (Test-SupportedPython @($venvPython))) {
        Write-Host "Rebuilding incompatible virtual environment with Python $minimumPython+..."
        & $pythonExecutable @pythonArguments -m venv --clear .venv
    }
    elseif (-not (Test-Path $venvPython)) {
        & $pythonExecutable @pythonArguments -m venv .venv
    }

    & '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt

    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
    }

    $databaseUrl = Get-Content '.env' | Where-Object { $_ -match '^\s*DATABASE_URL\s*=\s*\S+' } | Select-Object -First 1
    if (-not $databaseUrl) {
        $env:DATABASE_URL = 'sqlite:///./backend.db'
        Write-Host 'Using the local SQLite database.'
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
