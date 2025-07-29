# Google Ads Monitoring Agent - Deployment Script
# Run this script to deploy to Cloud Run

Write-Host "🚀 Deploying Google Ads Monitoring Agent to Cloud Run..." -ForegroundColor Green

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>$null
    Write-Host "✅ Google Cloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "   Or run: winget install Google.CloudSDK" -ForegroundColor Yellow
    exit 1
}

# Get project ID
$projectId = Read-Host "Enter your Google Cloud Project ID"
if (-not $projectId) {
    Write-Host "❌ Project ID is required" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host "🔧 Setting project to: $projectId" -ForegroundColor Yellow
gcloud config set project $projectId

# Get environment variables
Write-Host "🔐 Setting up environment variables..." -ForegroundColor Yellow
$clientId = Read-Host "Enter GOOGLE_ADS_CLIENT_ID"
$clientSecret = Read-Host "Enter GOOGLE_ADS_CLIENT_SECRET" -AsSecureString
$developerToken = Read-Host "Enter GOOGLE_ADS_DEVELOPER_TOKEN"
$refreshToken = Read-Host "Enter GOOGLE_ADS_REFRESH_TOKEN"

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
$clientSecretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Build the container
Write-Host "🔨 Building container..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/$projectId/visago-ads-monitor

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy visago-ads-monitor `
  --image gcr.io/$projectId/visago-ads-monitor `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars="GOOGLE_ADS_CLIENT_ID=$clientId" `
  --set-env-vars="GOOGLE_ADS_CLIENT_SECRET=$clientSecretPlain" `
  --set-env-vars="GOOGLE_ADS_DEVELOPER_TOKEN=$developerToken" `
  --set-env-vars="GOOGLE_ADS_REFRESH_TOKEN=$refreshToken"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Get the service URL
$serviceUrl = gcloud run services describe visago-ads-monitor --region=us-central1 --format="value(status.url)"

Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host "🌐 Service URL: $serviceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the service: curl $serviceUrl/health" -ForegroundColor White
Write-Host "2. Set up Cloud Scheduler to run every hour:" -ForegroundColor White
Write-Host "   gcloud scheduler jobs create http visago-ads-monitor-job --schedule='0 * * * *' --uri='$serviceUrl/run-monitoring' --http-method=GET --location=us-central1" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your Google Ads Monitoring Agent is now running in the cloud!" -ForegroundColor Green 