# start-db.ps1
# Starts the local portable PostgreSQL server.

$ErrorActionPreference = "Stop"

if (!(Test-Path ".postgres-env\data")) {
    Write-Error "Database cluster not initialized! Please run setup_env.ps1 first."
}

Write-Host "Starting PostgreSQL database server..." -ForegroundColor Cyan
& ".postgres-env\pgsql\bin\pg_ctl.exe" -D ".postgres-env\data" -l ".postgres-env\postgres.log" start

# Wait for server to start
Start-Sleep -Seconds 2

# Verify server status
Write-Host "`nVerifying connection status:" -ForegroundColor Yellow
& ".postgres-env\pgsql\bin\pg_isready.exe" -h localhost -p 5432
