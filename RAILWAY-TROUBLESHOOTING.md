# Railway Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Build Failures

**Problem**: Railway build fails during deployment
**Solutions**:
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility (>=16.0.0)
- Verify file paths are correct

### 2. Environment Variables Missing

**Problem**: Agent fails to start due to missing environment variables
**Solution**: Set these environment variables in Railway dashboard:

```
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
OPENAI_API_KEY=your_openai_api_key
GOOGLE_ADS_CUSTOMER_ID=2080307721
GOOGLE_ADS_MCC_ID=2558852824
```

### 3. Network Connectivity Issues

**Problem**: `ENOTFOUND oauth2.googleapis.com` errors
**Solutions**:
- Railway has good connectivity, this usually indicates DNS issues
- Check if the service is starting properly
- Verify environment variables are set correctly

### 4. Health Check Failures

**Problem**: Railway health checks fail
**Solutions**:
- Health check endpoint: `/health`
- Increased timeout to 300 seconds
- Check logs for startup errors

### 5. Service Not Starting

**Problem**: Service fails to start
**Debugging Steps**:

1. **Check Railway Logs**:
   ```bash
   # View real-time logs
   railway logs
   ```

2. **Test Locally First**:
   ```bash
   # Test environment variables
   node test-env.js
   
   # Test the cloud agent
   node cloud-agent.js
   ```

3. **Verify File Structure**:
   ```
   ✅ cloud-agent.js
   ✅ package.json
   ✅ railway.json
   ✅ .gitignore
   ❌ secrets.json (should be ignored)
   ❌ .env (should be ignored)
   ```

### 6. Authentication Issues

**Problem**: Google Ads API authentication fails
**Solutions**:
- Verify refresh token is valid and not expired
- Check client credentials are correct
- Ensure developer token is active

### 7. Rate Limiting

**Problem**: Too many API calls
**Solutions**:
- Agent includes 2-second delays between operations
- Monitoring runs every 60 minutes by default
- Check Google Ads API quotas

## Deployment Checklist

### Before Deploying:
- [ ] All environment variables set in Railway
- [ ] `cloud-agent.js` is the main file
- [ ] `package.json` has correct start script
- [ ] No sensitive files in repository
- [ ] `.gitignore` excludes secrets

### After Deploying:
- [ ] Check Railway logs for startup messages
- [ ] Verify health check endpoint responds
- [ ] Monitor for authentication errors
- [ ] Check Google Ads API access

## Quick Fixes

### Reset Deployment:
```bash
# In Railway dashboard
1. Go to your project
2. Click "Deployments"
3. Click "Redeploy" on latest deployment
```

### Update Environment Variables:
```bash
# In Railway dashboard
1. Go to your project
2. Click "Variables" tab
3. Add/update required variables
4. Redeploy automatically
```

### Check Logs:
```bash
# View recent logs
railway logs --tail 100
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOTFOUND oauth2.googleapis.com` | Network/DNS issue | Check environment variables |
| `Missing required environment variables` | Config issue | Set all required env vars |
| `Health check failed` | Startup issue | Check logs for errors |
| `Authentication failed` | Token issue | Verify refresh token |
| `Build failed` | Dependency issue | Check package.json |

## Support

If issues persist:
1. Check Railway status page
2. Review Google Ads API documentation
3. Verify credentials in Google Ads console
4. Test with dry run mode first

## Testing Locally

Before deploying to Railway, test locally:

```bash
# Set environment variables
export GOOGLE_ADS_CLIENT_ID="your_id"
export GOOGLE_ADS_CLIENT_SECRET="your_secret"
export GOOGLE_ADS_DEVELOPER_TOKEN="your_token"
export GOOGLE_ADS_REFRESH_TOKEN="your_refresh_token"
export OPENAI_API_KEY="your_openai_key"

# Test environment
node test-env.js

# Test cloud agent
node cloud-agent.js
``` 