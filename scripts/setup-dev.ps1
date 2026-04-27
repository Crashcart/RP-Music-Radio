# ═══════════════════════════════════════════════════════════════════
# AetherWave — Full Development Environment Setup (Windows)
# Run this in PowerShell as Administrator
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = "c:\Users\sid\Documents\Anti-gravity\RP-Music-Radio"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  AetherWave -- Dev Environment Setup" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Helper: check if a command exists
function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Helper: refresh PATH from registry
function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable(
        "Path", "Machine"
    )
    $userPath = [System.Environment]::GetEnvironmentVariable(
        "Path", "User"
    )
    $env:Path = $machinePath + ";" + $userPath
}

# ── 1. Check for winget ──────────────────────────────────────────
if (-not (Test-Command "winget")) {
    Write-Host "[!] winget not found." -ForegroundColor Red
    Write-Host "    Install App Installer from Microsoft Store" -ForegroundColor Yellow
    exit 1
}

# ── 2. Install Node.js (LTS) ────────────────────────────────────
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVer = node --version
    Write-Host "  OK - Node.js: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "  Installing Node.js LTS..." -ForegroundColor Cyan
    winget install OpenJS.NodeJS.LTS `
        --accept-source-agreements `
        --accept-package-agreements
    Refresh-Path
    if (Test-Command "node") {
        Write-Host "  OK - Node.js installed" -ForegroundColor Green
    } else {
        Write-Host "  WARN - Restart PowerShell, then re-run" -ForegroundColor Yellow
    }
}

# ── 3. Install Python ───────────────────────────────────────────
Write-Host "[2/5] Checking Python..." -ForegroundColor Yellow
if (Test-Command "python") {
    $pyVer = python --version
    Write-Host "  OK - $pyVer" -ForegroundColor Green
} else {
    Write-Host "  Installing Python 3.12..." -ForegroundColor Cyan
    winget install Python.Python.3.12 `
        --accept-source-agreements `
        --accept-package-agreements
    Refresh-Path
    if (Test-Command "python") {
        Write-Host "  OK - Python installed" -ForegroundColor Green
    } else {
        Write-Host "  WARN - Restart PowerShell, then re-run" -ForegroundColor Yellow
    }
}

# ── 4. Install Frontend Dependencies ────────────────────────────
Write-Host "[3/5] Installing frontend deps..." -ForegroundColor Yellow
$frontendDir = Join-Path $PROJECT_ROOT "frontend"

if (Test-Command "npm") {
    Push-Location $frontendDir
    try {
        npm install
        Write-Host "  OK - Frontend deps installed" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL - npm install error: $_" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "  SKIP - npm not available yet" -ForegroundColor Yellow
}

# ── 5. Install Backend Dependencies ─────────────────────────────
Write-Host "[4/5] Installing backend deps..." -ForegroundColor Yellow
$backendDir = Join-Path $PROJECT_ROOT "backend"
$reqFile = Join-Path $backendDir "requirements.txt"
$venvDir = Join-Path $backendDir ".venv"

$pythonCmd = $null
if (Test-Command "python") { $pythonCmd = "python" }
elseif (Test-Command "python3") { $pythonCmd = "python3" }

if ($pythonCmd) {
    if (-not (Test-Path $venvDir)) {
        Write-Host "  Creating venv..." -ForegroundColor Cyan
        & $pythonCmd -m venv $venvDir
    }

    $pipExe = Join-Path $venvDir "Scripts\pip.exe"
    if (Test-Path $pipExe) {
        Write-Host "  Installing pip packages..." -ForegroundColor Cyan
        & $pipExe install --upgrade pip
        & $pipExe install -r $reqFile
        Write-Host "  OK - Backend deps installed" -ForegroundColor Green
    } else {
        Write-Host "  FAIL - venv pip not found" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIP - Python not available yet" -ForegroundColor Yellow
}

# ── 6. Check Docker ─────────────────────────────────────────────
Write-Host "[5/5] Checking Docker..." -ForegroundColor Yellow
if (Test-Command "docker") {
    $dockerVer = docker --version
    Write-Host "  OK - $dockerVer" -ForegroundColor Green
} else {
    Write-Host "  WARN - Docker not found" -ForegroundColor Yellow
    Write-Host "  Get it: docker.com/products/docker-desktop" -ForegroundColor Yellow
}

# ── Done ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  If tools were just installed, restart PS and re-run." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Dev Mode:" -ForegroundColor White
Write-Host "    Terminal 1: cd $backendDir" -ForegroundColor Gray
Write-Host "                .venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "                uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "    Terminal 2: cd $frontendDir" -ForegroundColor Gray
Write-Host "                npm run dev" -ForegroundColor Gray
Write-Host ""
