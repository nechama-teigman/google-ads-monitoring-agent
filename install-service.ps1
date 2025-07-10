# Google Ads Background Agent Service Installer
# Run this script as Administrator to install the service

param(
    [string]$ServiceName = "GoogleAdsMonitoringAgent",
    [string]$DisplayName = "Google Ads Monitoring Agent",
    [string]$Description = "Monitors Google Ads campaigns for disapproved ads and creates duplicates"
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Installing Google Ads Background Agent as Windows Service..." -ForegroundColor Green

# Get the current directory
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodePath = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source

if (-not $NodePath) {
    Write-Host "❌ Node.js not found in PATH. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Create the service executable path
$AgentPath = Join-Path $ScriptPath "background-agent.js"

if (-not (Test-Path $AgentPath)) {
    Write-Host "❌ background-agent.js not found in current directory" -ForegroundColor Red
    exit 1
}

# Check if service already exists
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($ExistingService) {
    Write-Host "⚠️  Service '$ServiceName' already exists. Stopping and removing..." -ForegroundColor Yellow
    
    if ($ExistingService.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
    }
    
    Remove-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
}

# Create the service
try {
    $ServiceArgs = @{
        Name = $ServiceName
        DisplayName = $DisplayName
        Description = $Description
        BinaryPathName = "`"$NodePath`" `"$AgentPath`""
        StartupType = "Automatic"
        ErrorAction = "Stop"
    }
    
    New-Service @ServiceArgs
    
    Write-Host "✅ Service '$ServiceName' created successfully!" -ForegroundColor Green
    Write-Host "📋 Service Details:" -ForegroundColor Cyan
    Write-Host "   Name: $ServiceName" -ForegroundColor White
    Write-Host "   Display Name: $DisplayName" -ForegroundColor White
    Write-Host "   Path: $AgentPath" -ForegroundColor White
    Write-Host "   Startup: Automatic" -ForegroundColor White
    
    # Start the service
    Write-Host "🚀 Starting the service..." -ForegroundColor Green
    Start-Service -Name $ServiceName
    
    # Check if service started successfully
    Start-Sleep -Seconds 3
    $Service = Get-Service -Name $ServiceName
    
    if ($Service.Status -eq "Running") {
        Write-Host "✅ Service is now running!" -ForegroundColor Green
        Write-Host "📊 Service Status: $($Service.Status)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Service may not have started properly. Status: $($Service.Status)" -ForegroundColor Yellow
    }
    
    Write-Host "`n📋 Useful Commands:" -ForegroundColor Cyan
    Write-Host "   Start Service: Start-Service -Name '$ServiceName'" -ForegroundColor White
    Write-Host "   Stop Service: Stop-Service -Name '$ServiceName'" -ForegroundColor White
    Write-Host "   Check Status: Get-Service -Name '$ServiceName'" -ForegroundColor White
    Write-Host "   View Logs: Get-Content '$ScriptPath\agent-logs.txt' -Tail 50" -ForegroundColor White
    Write-Host "   Remove Service: Remove-Service -Name '$ServiceName' -Force" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to create service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 