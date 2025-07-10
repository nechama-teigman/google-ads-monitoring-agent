Write-Host "🚀 Starting Google Ads Background Agent..." -ForegroundColor Green
Write-Host "This will run in the background and monitor your campaigns every 60 minutes." -ForegroundColor Cyan
Write-Host "Logs will be saved to: agent-logs.txt" -ForegroundColor Yellow
Write-Host ""

# Check if background-agent.js exists
if (-not (Test-Path "background-agent.js")) {
    Write-Host "❌ background-agent.js not found!" -ForegroundColor Red
    Write-Host "Please make sure you're in the correct directory." -ForegroundColor Yellow
    exit 1
}

# Start the agent as a background job
$Job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node background-agent.js
} -Name "GoogleAdsAgent"

Write-Host "✅ Background agent started successfully!" -ForegroundColor Green
Write-Host "Job ID: $($Job.Id)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Cyan
Write-Host "   Check Status: Get-Job -Name 'GoogleAdsAgent'" -ForegroundColor White
Write-Host "   View Output: Receive-Job -Name 'GoogleAdsAgent'" -ForegroundColor White
Write-Host "   Stop Agent: Stop-Job -Name 'GoogleAdsAgent'" -ForegroundColor White
Write-Host "   View Logs: Get-Content 'agent-logs.txt' -Tail 20" -ForegroundColor White
Write-Host ""
Write-Host "💡 The agent will continue running even if you close this window." -ForegroundColor Yellow
Write-Host "   To stop it completely, run: Stop-Job -Name 'GoogleAdsAgent'" -ForegroundColor Yellow 