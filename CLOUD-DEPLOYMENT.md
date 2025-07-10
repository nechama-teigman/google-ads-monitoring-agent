# 🚀 Cloud Deployment Guide

Deploy your Google Ads Background Agent to the cloud for **24/7 monitoring**!

## **Why Cloud Deployment?**

✅ **24/7 Monitoring**: Runs even when your computer is off  
✅ **No Local Resources**: Doesn't use your computer's power  
✅ **Automatic Restarts**: Self-healing if it crashes  
✅ **Scalable**: Can handle multiple accounts  
✅ **Professional**: Enterprise-grade reliability  

## **Deployment Options**

### **Option 1: Railway (Recommended - Free Tier)**

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect your GitHub** repository
3. **Deploy automatically** with zero configuration

### **Option 2: Heroku (Free Tier Available)**

1. **Sign up** at [heroku.com](https://heroku.com)
2. **Install Heroku CLI**
3. **Deploy with one command**

### **Option 3: DigitalOcean ($5/month)**

1. **Create account** at [digitalocean.com](https://digitalocean.com)
2. **Deploy to Droplet**
3. **Set up monitoring**

## **Quick Railway Deployment**

### **Step 1: Prepare Your Repository**

Make sure you have these files in your repository:
- ✅ `cloud-agent.js` (main cloud agent)
- ✅ `package.json` (dependencies)
- ✅ `railway.json` (deployment config)
- ✅ `.env.example` (environment template)

### **Step 2: Set Environment Variables**

In Railway dashboard, add these environment variables:

```env
# Google Ads API Credentials
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_MCC_ID=2558852824
GOOGLE_ADS_CUSTOMER_ID=2080307721

# OpenAI API (for text rewriting)
OPENAI_API_KEY=your_openai_api_key

# Optional: Custom port
PORT=3000
```

### **Step 3: Deploy**

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add cloud deployment"
   git push origin main
   ```

2. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Set Environment Variables**:
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add all the environment variables above

4. **Deploy**:
   - Railway will automatically detect your Node.js app
   - It will run `npm start` to start the agent
   - Your agent will be live in minutes!

## **Verification**

### **Check Health Status**
Visit: `https://your-app-name.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-09T15:46:18.568Z",
  "uptime": 1234.567
}
```

### **Check Logs**
In Railway dashboard:
1. Go to your project
2. Click "Deployments" tab
3. Click on latest deployment
4. View logs in real-time

## **Monitoring Your Cloud Agent**

### **Railway Dashboard**
- **Real-time logs**: See what your agent is doing
- **Uptime monitoring**: Know if it's running
- **Automatic restarts**: Self-healing if it crashes

### **Health Check URL**
- **Status**: `https://your-app.railway.app/health`
- **Expected**: 200 OK with uptime info
- **If down**: Check Railway logs for errors

### **Log Monitoring**
Your agent logs everything to Railway's log system:
- ✅ Ad processing activities
- ✅ Error messages
- ✅ Performance metrics
- ✅ API call results

## **Costs**

### **Railway Free Tier**
- ✅ **500 hours/month** (enough for 24/7)
- ✅ **1GB RAM** (plenty for this agent)
- ✅ **Automatic scaling**
- ✅ **SSL certificates included**

### **If You Exceed Free Tier**
- **$5/month** for additional usage
- **Still very affordable** for 24/7 monitoring

## **Security**

### **Environment Variables**
- ✅ **Never commit** credentials to GitHub
- ✅ **Railway encrypts** all environment variables
- ✅ **Secure by default**

### **API Access**
- ✅ **HTTPS only** for all connections
- ✅ **Google Ads API** is secure
- ✅ **No data stored** on Railway servers

## **Troubleshooting**

### **Agent Not Starting**
1. **Check environment variables** in Railway
2. **Verify Google Ads credentials**
3. **Check logs** in Railway dashboard

### **Agent Not Processing Ads**
1. **Verify customer ID** is correct
2. **Check Google Ads API permissions**
3. **Review logs** for specific errors

### **High Memory Usage**
1. **Monitor logs** for memory leaks
2. **Restart deployment** if needed
3. **Upgrade plan** if necessary

## **Local vs Cloud Comparison**

| Feature | Local Agent | Cloud Agent |
|---------|-------------|-------------|
| **Uptime** | When computer on | 24/7 |
| **Cost** | Free | $0-5/month |
| **Setup** | Manual | Automated |
| **Monitoring** | Manual logs | Dashboard |
| **Restarts** | Manual | Automatic |
| **Scalability** | Limited | Unlimited |

## **Migration from Local to Cloud**

1. **Stop local agent**:
   ```bash
   # Find and stop the process
   Get-Process -Name "node" | Stop-Process
   ```

2. **Deploy to cloud** (follow steps above)

3. **Verify cloud agent** is working

4. **Monitor for 24 hours** to ensure stability

5. **Remove local setup** (optional)

## **Support**

### **Railway Support**
- **Documentation**: [docs.railway.app](https://docs.railway.app)
- **Community**: [discord.gg/railway](https://discord.gg/railway)
- **Email**: support@railway.app

### **Agent Issues**
- **Check logs** in Railway dashboard
- **Verify environment variables**
- **Test locally** first if needed

## **Next Steps**

1. **Deploy to Railway** (follow steps above)
2. **Set up monitoring** alerts
3. **Test for 24 hours**
4. **Scale if needed** (multiple accounts)

Your Google Ads agent will now run **24/7 in the cloud**! 🚀 