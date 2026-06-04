# start-db.ps1
# Starts the local portable PostgreSQL server in the foreground.

$ErrorActionPreference = "Stop"

if (!(Test-Path ".postgres-env\data")) {
    Write-Error "Database cluster not initialized! Please run setup_env.ps1 first."
}

# Auto-cleanup stale PID file if present
if (Test-Path ".postgres-env\data\postmaster.pid") {
    Write-Host "Stale postmaster.pid file detected. Cleaning up..." -ForegroundColor Yellow
    Remove-Item -Force ".postgres-env\data\postmaster.pid"
}

Write-Host "Starting PostgreSQL database server in foreground..." -ForegroundColor Cyan
& ".postgres-env\pgsql\bin\postgres.exe" -D ".postgres-env\data"
