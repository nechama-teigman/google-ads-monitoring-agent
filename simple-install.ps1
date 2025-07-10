# Simple Google Ads Background Agent Service Installer

Write-Host "🚀 Installing Google Ads Background Agent as Windows Service..." -ForegroundColor Green

# Get paths
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodePath = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
$AgentPath = Join-Path $ScriptPath "background-agent.js"

# Check requirements
if (-not $NodePath) {
    Write-Host "❌ Node.js not found in PATH. Please install Node.js first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $AgentPath)) {
    Write-Host "❌ background-agent.js not found in current directory" -ForegroundColor Red
    exit 1
}

# Remove existing service if it exists
$ExistingService = Get-Service -Name "GoogleAdsMonitoringAgent" -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "⚠️  Removing existing service..." -ForegroundColor Yellow
    if ($ExistingService.Status -eq "Running") {
        Stop-Service -Name "GoogleAdsMonitoringAgent" -Force
    }
    Remove-Service -Name "GoogleAdsMonitoringAgent" -Force
    Start-Sleep -Seconds 2
}

# Create new service
Write-Host "🔧 Creating Windows service..." -ForegroundColor Green
$ServiceArgs = @{
    Name = "GoogleAdsMonitoringAgent"
    DisplayName = "Google Ads Monitoring Agent"
    Description = "Monitors Google Ads campaigns for disapproved ads and creates duplicates"
    BinaryPathName = "`"$NodePath`" `"$AgentPath`""
    StartupType = "Automatic"
}

New-Service @ServiceArgs

# Start the service
Write-Host "🚀 Starting the service..." -ForegroundColor Green
Start-Service -Name "GoogleAdsMonitoringAgent"

# Check status
Start-Sleep -Seconds 3
$Service = Get-Service -Name "GoogleAdsMonitoringAgent"

if ($Service.Status -eq "Running") {
    Write-Host "✅ Service is now running!" -ForegroundColor Green
    Write-Host "📊 Service Status: $($Service.Status)" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Service may not have started properly. Status: $($Service.Status)" -ForegroundColor Yellow
}

Write-Host "`n📋 Useful Commands:" -ForegroundColor Cyan
Write-Host "   Check Status: Get-Service -Name 'GoogleAdsMonitoringAgent'" -ForegroundColor White
Write-Host "   Start Service: Start-Service -Name 'GoogleAdsMonitoringAgent'" -ForegroundColor White
Write-Host "   Stop Service: Stop-Service -Name 'GoogleAdsMonitoringAgent'" -ForegroundColor White
Write-Host "   View Logs: Get-Content '$ScriptPath\agent-logs.txt' -Tail 50" -ForegroundColor White 