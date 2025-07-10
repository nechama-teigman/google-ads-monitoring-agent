# Google Ads Monitoring Agent (Cloud Version)

Monitors Google Ads campaigns for disapproved ads and handles them automatically. Optimized for deployment on Google Cloud Run.

---

## 🚀 Deployment: Google Cloud Run

1. **Push your code to GitHub.**
2. **Connect your GitHub repo to Google Cloud Run.**
3. **Set the required environment variables in Cloud Run:**
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_REFRESH_TOKEN`
   - `OPENAI_API_KEY`
   - `GOOGLE_ADS_CUSTOMER_ID`
   - `GOOGLE_ADS_MCC_ID` (optional)
4. **Cloud Run will automatically build and deploy your service.**

---

## ⚙️ Usage

- The agent runs continuously, monitoring all enabled and paused campaigns for disapproved ads.
- Exposes a `/health` endpoint for monitoring:
  - Visit `https://<your-service-url>/health` to check status.
- Logs are available in the Google Cloud Run console.

---

## 🛡️ Security & Local Testing

- **Do NOT commit secrets or `.env` files to the repo.**
- For local testing, create a `.env` file (excluded by `.gitignore`) with the required variables.

---

## 📄 License

MIT 