# setup_env.ps1
# Automates the setup of the local portable development environment.

$ErrorActionPreference = "Stop"

Write-Host "=== Phase 0 Environment Setup ===" -ForegroundColor Green

# 1. Git Initialization
Write-Host "`n--- Step 1: Initialize Git ---" -ForegroundColor Cyan
if (!(Test-Path .git)) {
    git init
    Write-Host "Git repository initialized."
} else {
    Write-Host "Git repository already initialized."
}

# Download Helper
function Download-File($url, $output) {
    Write-Host "Downloading $url to $output..."
    try {
        Import-Module BitsTransfer
        Start-BitsTransfer -Source $url -Destination $output -ErrorAction Stop
        Write-Host "Download complete (via BITS)."
    } catch {
        Write-Host "BITS transfer failed or unavailable. Falling back to Invoke-WebRequest..."
        Invoke-WebRequest -Uri $url -OutFile $output
        Write-Host "Download complete (via WebRequest)."
    }
}

# 2. Node.js Setup
Write-Host "`n--- Step 2: Set up Portable Node.js ---" -ForegroundColor Cyan
if (!(Test-Path .node-env)) {
    New-Item -ItemType Directory -Path .node-env | Out-Null
    Download-File "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" "node.zip"
    
    Write-Host "Extracting Node.js..."
    if (Test-Path ".node-env-temp") { Remove-Item -Recurse -Force ".node-env-temp" }
    New-Item -ItemType Directory -Path ".node-env-temp" | Out-Null
    Expand-Archive -Path "node.zip" -DestinationPath ".node-env-temp"
    
    # Copy all extracted files up to .node-env
    Copy-Item -Path ".node-env-temp\node-v20.11.1-win-x64\*" -Destination ".node-env" -Recurse
    
    # Cleanup
    Remove-Item -Recurse -Force ".node-env-temp", "node.zip"
    Write-Host "Node.js environment set up successfully at .node-env."
} else {
    Write-Host "Node.js environment already exists."
}

# 3. PostgreSQL Setup
Write-Host "`n--- Step 3: Set up Portable PostgreSQL ---" -ForegroundColor Cyan
if (!(Test-Path .postgres-env)) {
    New-Item -ItemType Directory -Path .postgres-env | Out-Null
    Download-File "https://get.enterprisedb.com/postgresql/postgresql-15.3-1-windows-x64-binaries.zip" "postgres.zip"
    
    Write-Host "Extracting PostgreSQL (this can take a minute)..."
    # Expand-Archive extracts everything to .postgres-env/pgsql directory
    Expand-Archive -Path "postgres.zip" -DestinationPath ".postgres-env"
    
    Remove-Item -Force "postgres.zip"
    Write-Host "PostgreSQL binaries extracted to .postgres-env/pgsql."
    
    Write-Host "Initializing Database Cluster..."
    # Create the data folder
    New-Item -ItemType Directory -Path ".postgres-env\data" | Out-Null
    
    # Run initdb with trust authentication
    & ".postgres-env\pgsql\bin\initdb.exe" -D ".postgres-env\data" -U postgres --auth-host=trust --auth-local=trust
    Write-Host "PostgreSQL database cluster initialized at .postgres-env\data."
} else {
    Write-Host "PostgreSQL environment already exists."
}

Write-Host "`n=== Environment Setup Complete! ===" -ForegroundColor Green
