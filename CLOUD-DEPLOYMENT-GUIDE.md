# Cloud Deployment Guide for Google Ads Monitoring Agent

## Prerequisites

1. **Install Google Cloud CLI**
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `winget install Google.CloudSDK`

2. **Authenticate with Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

## Deployment Steps

### 1. Build and Deploy to Cloud Run

```bash
# Build the container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/visago-ads-monitor

# Deploy to Cloud Run
gcloud run deploy visago-ads-monitor \
  --image gcr.io/YOUR_PROJECT_ID/visago-ads-monitor \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_ADS_CLIENT_ID=your_client_id" \
  --set-env-vars="GOOGLE_ADS_CLIENT_SECRET=your_client_secret" \
  --set-env-vars="GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token" \
  --set-env-vars="GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token"
```

### 2. Set Environment Variables (Alternative Method)

Instead of setting env vars during deployment, you can set them in the Cloud Run console:

1. Go to Cloud Run in Google Cloud Console
2. Select your service
3. Go to "Edit & Deploy New Revision"
4. Under "Variables & Secrets", add:
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_REFRESH_TOKEN`

### 3. Set Up Cloud Scheduler

```bash
# Create a job that runs every hour
gcloud scheduler jobs create http visago-ads-monitor-job \
  --schedule="0 * * * *" \
  --uri="https://YOUR_SERVICE_URL/run-monitoring" \
  --http-method=GET \
  --location=us-central1
```

### 4. Test the Deployment

```bash
# Test health endpoint
curl https://YOUR_SERVICE_URL/health

# Test monitoring endpoint
curl https://YOUR_SERVICE_URL/run-monitoring
```

## Environment Variables

Make sure to set these environment variables in Cloud Run:

- `GOOGLE_ADS_CLIENT_ID` - Your Google Ads API client ID
- `GOOGLE_ADS_CLIENT_SECRET` - Your Google Ads API client secret
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Your Google Ads developer token
- `GOOGLE_ADS_REFRESH_TOKEN` - Your Google Ads refresh token

## Service Endpoints

- `/` - Health check
- `/health` - Detailed health status
- `/run-monitoring` - Trigger monitoring cycle (for Cloud Scheduler)

## Monitoring

The service will:
1. Find enabled disapproved ads
2. Pause them
3. Create approved duplicates
4. Return results via JSON response

## Troubleshooting

1. **Check logs**: `gcloud logs read --service=visago-ads-monitor`
2. **Check environment variables**: Verify all required env vars are set
3. **Test locally**: Run `node cloud-monitor.js` locally first
4. **Check permissions**: Ensure the service has proper Google Ads API access

## Files

- `cloud-monitor.js` - Production cloud version
- `clean-monitor.js` - Local development version
- `package.json` - Dependencies and scripts
- `Dockerfile` - Container configuration 