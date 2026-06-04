# stop-db.ps1
# Stops the local portable PostgreSQL server.

$ErrorActionPreference = "Continue"

Write-Host "Stopping PostgreSQL database server..." -ForegroundColor Cyan
& ".postgres-env\pgsql\bin\pg_ctl.exe" -D ".postgres-env\data" stop
