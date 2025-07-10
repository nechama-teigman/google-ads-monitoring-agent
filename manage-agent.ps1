# Google Ads Background Agent Management Script
# Easy commands to manage the monitoring service

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "logs", "restart", "install", "uninstall")]
    [string]$Action,
    
    [string]$ServiceName = "GoogleAdsMonitoringAgent"
)

$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptPath "agent-logs.txt"

function Show-Status {
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if ($Service) {
        $StatusColor = switch ($Service.Status) {
            "Running" { "Green" }
            "Stopped" { "Red" }
            default { "Yellow" }
        }
        
        Write-Host "📊 Service Status:" -ForegroundColor Cyan
        Write-Host "   Name: $($Service.Name)" -ForegroundColor White
        Write-Host "   Display Name: $($Service.DisplayName)" -ForegroundColor White
        Write-Host "   Status: $($Service.Status)" -ForegroundColor $StatusColor
        Write-Host "   Start Type: $($Service.StartType)" -ForegroundColor White
        
        if (Test-Path $LogFile) {
            $LastLog = Get-Item $LogFile | Select-Object LastWriteTime
            Write-Host "   Last Log Update: $($LastLog.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Service '$ServiceName' not found" -ForegroundColor Red
        Write-Host "💡 Run '.\manage-agent.ps1 -Action install' to install the service" -ForegroundColor Yellow
    }
}

function Show-Logs {
    if (Test-Path $LogFile) {
        Write-Host "📋 Recent Log Entries:" -ForegroundColor Cyan
        Get-Content $LogFile -Tail 20 | ForEach-Object {
            if ($_ -match "ERROR") {
                Write-Host $_ -ForegroundColor Red
            } elseif ($_ -match "WARN") {
                Write-Host $_ -ForegroundColor Yellow
            } elseif ($_ -match "SUCCESS|✅") {
                Write-Host $_ -ForegroundColor Green
            } else {
                Write-Host $_ -ForegroundColor White
            }
        }
    } else {
        Write-Host "❌ No log file found at: $LogFile" -ForegroundColor Red
    }
}

switch ($Action) {
    "start" {
        Write-Host "🚀 Starting Google Ads Monitoring Agent..." -ForegroundColor Green
        try {
            Start-Service -Name $ServiceName
            Start-Sleep -Seconds 2
            Show-Status
        } catch {
            Write-Host "❌ Failed to start service: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    "stop" {
        Write-Host "🛑 Stopping Google Ads Monitoring Agent..." -ForegroundColor Yellow
        try {
            Stop-Service -Name $ServiceName -Force
            Start-Sleep -Seconds 2
            Show-Status
        } catch {
            Write-Host "❌ Failed to stop service: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    "status" {
        Show-Status
    }
    
    "logs" {
        Show-Logs
    }
    
    "restart" {
        Write-Host "🔄 Restarting Google Ads Monitoring Agent..." -ForegroundColor Cyan
        try {
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            Start-Service -Name $ServiceName
            Start-Sleep -Seconds 2
            Show-Status
        } catch {
            Write-Host "❌ Failed to restart service: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    "install" {
        Write-Host "🔧 Installing service..." -ForegroundColor Green
        & "$ScriptPath\install-service.ps1"
    }
    
    "uninstall" {
        Write-Host "🗑️  Uninstalling Google Ads Monitoring Agent..." -ForegroundColor Yellow
        
        $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($Service) {
            if ($Service.Status -eq "Running") {
                Stop-Service -Name $ServiceName -Force
                Start-Sleep -Seconds 2
            }
            Remove-Service -Name $ServiceName -Force
            Write-Host "✅ Service uninstalled successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Service '$ServiceName' not found" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n💡 Usage Examples:" -ForegroundColor Cyan
Write-Host "   .\manage-agent.ps1 -Action status    # Check service status" -ForegroundColor White
Write-Host "   .\manage-agent.ps1 -Action start     # Start the service" -ForegroundColor White
Write-Host "   .\manage-agent.ps1 -Action stop      # Stop the service" -ForegroundColor White
Write-Host "   .\manage-agent.ps1 -Action logs      # View recent logs" -ForegroundColor White
Write-Host "   .\manage-agent.ps1 -Action restart   # Restart the service" -ForegroundColor White 