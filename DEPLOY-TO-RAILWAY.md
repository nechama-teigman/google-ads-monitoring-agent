# 🚀 Deploy to Railway - Step by Step

## **Step 1: Install Git (if not installed)**

1. Download Git from: https://git-scm.com/download/win
2. Install with default settings
3. Restart your terminal/PowerShell

## **Step 2: Create GitHub Repository**

1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it: `google-ads-monitoring-agent`
4. Make it **Public** (Railway needs access)
5. Don't initialize with README (we'll push our files)

## **Step 3: Upload Your Files to GitHub**

### **Option A: Using GitHub Desktop (Easiest)**
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Install and sign in
3. Click "Clone a repository from the Internet"
4. Select your new repository
5. Choose a local path (e.g., `C:\Users\necha\Desktop\google-ads-agent`)
6. Copy all your files to this folder:
   - `background-agent.js`
   - `package.json`
   - `railway.json`
   - `CLOUD-DEPLOYMENT.md`
   - `secrets.json` (⚠️ **Don't upload this file!**)
   - `.env` (⚠️ **Don't upload this file!**)

### **Option B: Using Git Commands**
```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/google-ads-monitoring-agent.git
git push -u origin main
```

## **Step 4: Deploy to Railway**

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository: `google-ads-monitoring-agent`
6. Click "Deploy"

## **Step 5: Set Environment Variables**

In Railway dashboard:

1. Click on your project
2. Go to "Variables" tab
3. Add these variables:

```env
# Google Ads API Credentials
GOOGLE_ADS_CLIENT_ID=your_client_id_from_secrets.json
GOOGLE_ADS_CLIENT_SECRET=your_client_secret_from_secrets.json
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token_from_secrets.json
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token_from_secrets.json
GOOGLE_ADS_MCC_ID=2558852824
GOOGLE_ADS_CUSTOMER_ID=2080307721

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_from_env

# Optional
PORT=3000
MONITORING_INTERVAL=60
DRY_RUN=false
```

## **Step 6: Get Your Credentials**

### **From secrets.json:**
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET", 
  "developer_token": "YOUR_DEVELOPER_TOKEN",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

### **From .env:**
```
OPENAI_API_KEY=your_openai_api_key_here
```

## **Step 7: Verify Deployment**

1. **Check Health**: Visit `https://your-app-name.railway.app/health`
2. **Check Logs**: In Railway dashboard → Deployments → Latest deployment
3. **Monitor**: Watch the logs for successful initialization

## **Step 8: Test the Cloud Agent**

The agent will automatically:
- ✅ Start monitoring every 60 minutes
- ✅ Process disapproved ads
- ✅ Create duplicates and pause originals
- ✅ Handle 3-ad limits gracefully
- ✅ Log all activities

## **Troubleshooting**

### **Agent Not Starting**
- Check environment variables in Railway
- Verify Google Ads credentials
- Check Railway logs for errors

### **Agent Not Processing Ads**
- Verify customer ID is correct
- Check Google Ads API permissions
- Review logs for specific errors

### **3-Ad Limit Errors**
- The agent now handles this gracefully
- It will skip ads when limit is reached
- Check logs for "Skipped ad due to 3-ad limit"

## **Monitoring Your Cloud Agent**

### **Railway Dashboard**
- Real-time logs
- Uptime monitoring
- Automatic restarts

### **Health Check URL**
- Status: `https://your-app.railway.app/health`
- Expected: 200 OK with uptime info

## **Costs**

- **Free Tier**: 500 hours/month (enough for 24/7)
- **If exceeded**: $5/month
- **Very affordable** for 24/7 monitoring

## **Benefits of Cloud Deployment**

✅ **24/7 Monitoring**: Runs even when your computer is off  
✅ **No Local Resources**: Doesn't use your computer's power  
✅ **Automatic Restarts**: Self-healing if it crashes  
✅ **Professional Monitoring**: Web dashboard with logs  
✅ **Scalable**: Can handle multiple accounts  
✅ **Secure**: Environment variables are encrypted  

## **Next Steps After Deployment**

1. **Monitor for 24 hours** to ensure stability
2. **Set up alerts** if needed
3. **Scale** to multiple accounts if needed
4. **Stop local agent** once cloud is confirmed working

Your Google Ads agent will now run **24/7 in the cloud**! 🚀 