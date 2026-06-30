$ErrorActionPreference = "Stop"

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"
$backendPython = Join-Path $backendPath "venv\Scripts\python.exe"
$frontendPackage = Join-Path $frontendPath "package.json"

if (-not (Test-Path -LiteralPath $backendPython)) {
    Write-Error "Backend virtual environment was not found at: $backendPython"
}

if (-not (Test-Path -LiteralPath $frontendPackage)) {
    Write-Error "Frontend package.json was not found at: $frontendPackage"
}

function Convert-ToPowerShellLiteral {
    param([string] $Value)

    return "'" + $Value.Replace("'", "''") + "'"
}

$backendCommand = @(
    "Set-Location -LiteralPath $(Convert-ToPowerShellLiteral $backendPath)"
    "& $(Convert-ToPowerShellLiteral $backendPython) -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
) -join "; "

$frontendCommand = @(
    "Set-Location -LiteralPath $(Convert-ToPowerShellLiteral $frontendPath)"
    "npm.cmd run dev -- --host 127.0.0.1"
) -join "; "

Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $backendCommand
)

Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $frontendCommand
)

Write-Host "Beauty Store dev servers are starting..."
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Frontend: http://127.0.0.1:5173"
