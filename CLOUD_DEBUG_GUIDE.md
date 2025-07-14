# Cloud Deployment Debugging Guide

## Common Cloud Run Issues & Solutions

### 1. Environment Variables Missing
**Symptoms:** "Missing credentials" or "undefined" errors
**Solution:** Ensure all environment variables are set in Cloud Run:
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `OPENAI_API_KEY`

### 2. Google Ads API Authentication Issues
**Symptoms:** "invalid_grant", "GRPC target method can't be resolved"
**Solutions:**
- Regenerate refresh token from Google Ads API
- Ensure developer token is valid and not expired
- Check if MCC account has proper permissions

### 3. Node.js Version Issues
**Symptoms:** Build failures or runtime errors
**Solution:** Updated package.json to use Node.js >=18.0.0 (Cloud Run compatible)

### 4. Network/Connectivity Issues
**Symptoms:** Timeout errors, connection refused
**Solutions:**
- Ensure Cloud Run has internet access
- Check if Google Ads API endpoints are accessible
- Verify no firewall restrictions

## Debugging Steps

### Step 1: Test Environment Variables
```bash
# Deploy and run the enhanced run-job.js
# It will check all environment variables and show detailed error messages
```

### Step 2: Test Google Ads API Connection
```bash
# Deploy and run test-cloud-debug.js
# This will test the basic Google Ads API connection
```

### Step 3: Check Cloud Run Logs
1. Go to Google Cloud Console
2. Navigate to Cloud Run
3. Select your service
4. Click on "Logs" tab
5. Look for detailed error messages

### Step 4: Common Error Messages & Solutions

#### "GRPC target method can't be resolved"
- **Cause:** Developer token issues or API version mismatch
- **Solution:** Regenerate developer token, update google-ads-api package

#### "invalid_grant"
- **Cause:** Refresh token expired or invalid
- **Solution:** Regenerate refresh token from Google Ads API

#### "Missing credentials"
- **Cause:** Environment variables not set
- **Solution:** Set all required environment variables in Cloud Run

#### "Permission denied"
- **Cause:** MCC account doesn't have access to sub-account
- **Solution:** Verify MCC permissions and customer ID

## Deployment Checklist

- [ ] All environment variables set in Cloud Run
- [ ] Google Ads API credentials are fresh and valid
- [ ] MCC account has proper permissions
- [ ] Customer ID is correct (2080307721)
- [ ] Node.js version is compatible (>=18.0.0)
- [ ] All dependencies are installed

## Testing Commands

### Local Testing
```bash
# Test environment variables
node test-cloud-debug.js

# Test full agent
node run-job.js
```

### Cloud Testing
1. Deploy to Cloud Run
2. Check logs immediately after deployment
3. Look for the detailed error messages from enhanced logging

## Next Steps

1. Deploy the updated code with enhanced logging
2. Check Cloud Run logs for specific error messages
3. Use the error messages to identify the exact issue
4. Apply the appropriate solution from this guide

## Support

If you're still having issues after following this guide:
1. Share the exact error messages from Cloud Run logs
2. Include the environment variable check results
3. Note any specific error codes or status messages 