# Setting Up Environment Variables in Railway

## Step-by-Step Guide

### 1. Get Your Google Ads Credentials

First, extract your credentials from your local `secrets.json` file:

```bash
# View your current secrets (replace with your actual values)
cat secrets.json
```

### 2. Set Environment Variables in Railway Dashboard

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Select your project

2. **Navigate to Variables Tab**
   - Click on "Variables" in the left sidebar

3. **Add Each Environment Variable**

   Add these variables one by one:

   ```
   GOOGLE_ADS_CLIENT_ID=your_client_id_from_secrets.json
   GOOGLE_ADS_CLIENT_SECRET=your_client_secret_from_secrets.json
   GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token_from_secrets.json
   GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token_from_secrets.json
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_ADS_CUSTOMER_ID=2080307721
   GOOGLE_ADS_MCC_ID=2558852824
   ```

### 3. Extract Values from Your secrets.json

Your `secrets.json` should look like this:
```json
{
  "client_id": "your_client_id_here",
  "client_secret": "your_client_secret_here", 
  "developer_token": "your_developer_token_here",
  "refresh_token": "your_refresh_token_here"
}
```

### 4. Copy Values to Railway

| Railway Variable | Value from secrets.json |
|------------------|------------------------|
| `GOOGLE_ADS_CLIENT_ID` | `client_id` value |
| `GOOGLE_ADS_CLIENT_SECRET` | `client_secret` value |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | `developer_token` value |
| `GOOGLE_ADS_REFRESH_TOKEN` | `refresh_token` value |

### 5. Add OpenAI API Key

You'll also need your OpenAI API key:
- `OPENAI_API_KEY`: Your OpenAI API key

### 6. Optional Variables

These have default values but you can set them:
- `GOOGLE_ADS_CUSTOMER_ID`: `2080307721` (your sub account)
- `GOOGLE_ADS_MCC_ID`: `2558852824` (your MCC account)

### 7. Redeploy After Setting Variables

Once you've added all the environment variables:
1. Railway will automatically redeploy
2. Check the logs to see if it starts successfully
3. The health check should work at `https://your-app.railway.app/health`

## Verification

After setting the variables, you should see in the Railway logs:
```
✅ Google Ads Cloud Agent initialized successfully
🚀 Cloud agent health check available on port [PORT]
🎯 Cloud agent is now running 24/7!
```

## Common Issues

- **Missing variables**: The agent will fail to start if any required variable is missing
- **Invalid tokens**: Make sure your refresh token is still valid
- **Network issues**: Railway has good connectivity, so network errors usually mean missing env vars

## Quick Test

You can test locally first by creating a `.env` file:

```bash
# Create .env file with your values
echo "GOOGLE_ADS_CLIENT_ID=your_client_id" > .env
echo "GOOGLE_ADS_CLIENT_SECRET=your_client_secret" >> .env
echo "GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token" >> .env
echo "GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token" >> .env
echo "OPENAI_API_KEY=your_openai_key" >> .env

# Test locally
node test-env.js
node cloud-agent.js
``` 