$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $root 'frontend'

Write-Host 'Preparing frontend environment...'
Push-Location $frontendPath
try {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'npm is not installed or not available in PATH.'
    }

    & npm install

    Write-Host 'Starting frontend dev server...'
    Write-Host 'Frontend: http://localhost:5173'
    & npm run dev
}
finally {
    Pop-Location
}
