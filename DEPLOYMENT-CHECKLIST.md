# Railway Deployment Checklist

## ✅ Pre-Deployment Checks

### 1. Repository Connection
- [ ] GitHub repository is connected to Railway
- [ ] Correct branch is selected (main/master)
- [ ] Repository is public or Railway has access

### 2. Files in Repository
- [ ] `package.json` exists and has correct start script
- [ ] `railway.json` exists with correct configuration
- [ ] `cloud-agent.js` exists (or `railway-test.js` for testing)
- [ ] `.gitignore` excludes sensitive files
- [ ] No `secrets.json` or `.env` files in repository

### 3. Environment Variables in Railway
- [ ] `GOOGLE_ADS_CLIENT_ID` is set
- [ ] `GOOGLE_ADS_CLIENT_SECRET` is set
- [ ] `GOOGLE_ADS_DEVELOPER_TOKEN` is set
- [ ] `GOOGLE_ADS_REFRESH_TOKEN` is set
- [ ] `OPENAI_API_KEY` is set
- [ ] `GOOGLE_ADS_CUSTOMER_ID` is set (optional)
- [ ] `GOOGLE_ADS_MCC_ID` is set (optional)

## 🔧 Deployment Steps

### Step 1: Force New Deployment
1. Go to Railway Dashboard
2. Click "Deployments" tab
3. Click "Deploy" or "Redeploy"

### Step 2: Check Deployment Logs
1. Watch the deployment logs
2. Look for any build errors
3. Verify the service starts successfully

### Step 3: Test the Deployment
1. Get your Railway URL (e.g., `https://your-app.railway.app`)
2. Test these endpoints:
   - `https://your-app.railway.app/` (should show test page)
   - `https://your-app.railway.app/health` (should return JSON)
   - `https://your-app.railway.app/files` (should list files)
   - `https://your-app.railway.app/env` (should show env vars)

## 🚨 Common Issues

### Issue: "Repository not connected"
**Solution:**
1. Go to Railway project settings
2. Click "Connect Repository"
3. Select your GitHub repository
4. Choose the correct branch

### Issue: "Build failed"
**Solution:**
1. Check Railway logs for specific errors
2. Verify `package.json` has correct dependencies
3. Make sure all required files are in repository

### Issue: "Environment variables missing"
**Solution:**
1. Go to Railway Variables tab
2. Add missing environment variables
3. Redeploy after adding variables

### Issue: "Service not starting"
**Solution:**
1. Check if the start command is correct
2. Verify the main file exists (`cloud-agent.js` or `railway-test.js`)
3. Check Railway logs for startup errors

## 📊 Testing Commands

### Test Locally First:
```bash
# Test environment variables
node test-env.js

# Test the cloud agent
node cloud-agent.js

# Test the railway test server
node railway-test.js
```

### Test on Railway:
```bash
# Check if your Railway URL is accessible
curl https://your-app.railway.app/health

# Check environment variables
curl https://your-app.railway.app/env

# Check files in deployment
curl https://your-app.railway.app/files
```

## 🔄 Switch Back to Cloud Agent

After testing with `railway-test.js`, switch back to the cloud agent:

1. Edit `railway.json`:
   ```json
   "startCommand": "node cloud-agent.js"
   ```

2. Redeploy the project

## 📝 Success Indicators

You'll know it's working when you see:
- ✅ Deployment completes without errors
- ✅ Health check returns `{"status":"healthy"}`
- ✅ Environment variables show as "SET"
- ✅ Cloud agent logs show "Google Ads Cloud Agent initialized successfully" 

---

The error message you’re seeing means that **Git is not installed on your computer**. You need Git to push your code to GitHub.

---

## **How to Fix: Install Git**

### **1. Download Git for Windows**
- Go to: [https://git-scm.com/download/win](https://git-scm.com/download/win)
- The download should start automatically.

### **2. Run the Installer**
- Open the downloaded `.exe` file.
- Click through the installer (the default options are fine for most users).
- Finish the installation.

### **3. Restart Your Terminal**
- Close your current PowerShell or Command Prompt window.
- Open a new one (or use Git Bash, which is installed with Git).

### **4. Try the Git Commands Again**
Go back to your project folder and run:
```sh
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/nechama-teigman/google-ads-monitoring-agent.git
git push -u origin main
```

---

**After this, your code will be on GitHub and you can deploy with Render!**

If you have any trouble installing Git or running the commands, let me know and I’ll help you through it. 

---

Git is **still not recognized** in your terminal, which means it’s not in your system’s PATH.  
This is a common issue on Windows, even if you have Git for Windows installed.

---

## **How to Fix: Make Git Available in PowerShell/Command Prompt**

### **Option 1: Use Git Bash**
- Open the **Start Menu**.
- Type **Git Bash** and open it.
- In the Git Bash window, type:
  ```sh
  git --version
  ```
- If you see a version number, you can use Git Bash to run all the git commands.

---

### **Option 2: Add Git to Your System PATH**

1. **Re-run the Git for Windows Installer**
   - Download the latest installer from [https://git-scm.com/download/win](https://git-scm.com/download/win) if you don’t have it.
   - Start the installer.

2. **During Installation:**
   - When you reach the step **“Adjusting your PATH environment”**, select:
     - **“Git from the command line and also from 3rd-party software”**
   - Complete the installation.

3. **Restart Your Computer**
   - This ensures the PATH changes take effect.

4. **Open a New PowerShell or Command Prompt**
   - Type:
     ```sh
     git --version
     ```
   - You should now see the version number.

---

### **Option 3: Manually Add Git to PATH**

1. **Find the Git Installation Path**
   - Usually: `C:\Program Files\Git\cmd`

2. **Add to PATH:**
   - Open **Start Menu** → search for **Environment Variables** → select **Edit the system environment variables**.
   - Click **Environment Variables**.
   - Under **System variables**, find and select **Path**, then click **Edit**.
   - Click **New** and add:  
     `C:\Program Files\Git\cmd`
   - Click **OK** to close all dialogs.

3. **Restart your terminal** and try:
   ```sh
   git --version
   ```

---

**Once you see a version number, you can proceed with the git commands to push your code.**

---

**Let me know which option you try and if you need step-by-step screenshots or further help!** 