// Script to get Google Ads credentials for Railway deployment
const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

async function getCredentials() {
  console.log('🔑 Getting Google Ads credentials for Railway deployment...\n');
  
  try {
    // Read client_secret.json
    const clientSecretPath = path.join(__dirname, 'client_secret.json');
    const clientSecretData = await fs.readFile(clientSecretPath, 'utf8');
    const clientSecret = JSON.parse(clientSecretData);
    
    console.log('✅ Found client_secret.json');
    console.log(`📋 Client ID: ${clientSecret.installed.client_id}`);
    console.log(`📋 Client Secret: ${clientSecret.installed.client_secret}`);
    console.log(`📋 Project ID: ${clientSecret.installed.project_id}`);
    
    console.log('\n🔧 Next steps:');
    console.log('1. Go to Google Ads API Center: https://developers.google.com/google-ads/api/docs/first-call/dev-token');
    console.log('2. Get your Developer Token');
    console.log('3. Run this script to get your Refresh Token');
    
    console.log('\n📝 For Railway, you need these environment variables:');
    console.log('GOOGLE_ADS_CLIENT_ID=' + clientSecret.installed.client_id);
    console.log('GOOGLE_ADS_CLIENT_SECRET=' + clientSecret.installed.client_secret);
    console.log('GOOGLE_ADS_DEVELOPER_TOKEN=YOUR_DEVELOPER_TOKEN_HERE');
    console.log('GOOGLE_ADS_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE');
    console.log('OPENAI_API_KEY=YOUR_OPENAI_API_KEY');
    console.log('GOOGLE_ADS_CUSTOMER_ID=2080307721');
    console.log('GOOGLE_ADS_MCC_ID=2558852824');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getCredentials(); 