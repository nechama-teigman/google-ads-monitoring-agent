// Script to help set up Cloud Run environment variables
const fs = require('fs').promises;
const path = require('path');

async function setupCloudRunEnv() {
  try {
    console.log('🔧 Setting up Cloud Run environment variables...\n');
    
    // Read client_secret.json
    const clientSecretPath = path.join(__dirname, 'client_secret.json');
    const clientSecretData = await fs.readFile(clientSecretPath, 'utf8');
    const clientSecret = JSON.parse(clientSecretData);
    
    console.log('✅ Found client_secret.json');
    console.log(`📋 Client ID: ${clientSecret.installed.client_id}`);
    console.log(`📋 Client Secret: ${clientSecret.installed.client_secret}`);
    console.log(`📋 Project ID: ${clientSecret.installed.project_id}`);
    
    console.log('\n🔧 For Cloud Run deployment, you need to set these environment variables:');
    console.log('\n📝 Required Environment Variables:');
    console.log(`GOOGLE_ADS_CLIENT_ID=${clientSecret.installed.client_id}`);
    console.log(`GOOGLE_ADS_CLIENT_SECRET=${clientSecret.installed.client_secret}`);
    console.log('GOOGLE_ADS_DEVELOPER_TOKEN=YOUR_DEVELOPER_TOKEN_HERE');
    console.log('GOOGLE_ADS_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE');
    console.log('OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE');
    console.log('GOOGLE_ADS_CUSTOMER_ID=2080307721');
    console.log('GOOGLE_ADS_MCC_ID=2558852824');
    
    console.log('\n🔧 Steps to get missing credentials:');
    console.log('1. Developer Token:');
    console.log('   - Go to: https://developers.google.com/google-ads/api/docs/first-call/dev-token');
    console.log('   - Apply for a developer token if you don\'t have one');
    console.log('   - Copy the developer token');
    
    console.log('\n2. Refresh Token:');
    console.log('   - You need to run an OAuth flow to get a refresh token');
    console.log('   - This requires user interaction to authorize the app');
    console.log('   - The refresh token is long-lived and doesn\'t expire');
    
    console.log('\n3. OpenAI API Key:');
    console.log('   - Go to: https://platform.openai.com/api-keys');
    console.log('   - Create a new API key');
    console.log('   - Copy the API key');
    
    console.log('\n🔧 Setting up in Cloud Run:');
    console.log('1. Go to your Cloud Run service');
    console.log('2. Click "Edit & Deploy New Revision"');
    console.log('3. Go to "Variables & Secrets" tab');
    console.log('4. Add each environment variable with the values above');
    console.log('5. Deploy the new revision');
    
    console.log('\n⚠️  Important Notes:');
    console.log('- Keep your credentials secure and never commit them to version control');
    console.log('- The refresh token is sensitive - treat it like a password');
    console.log('- Make sure your Cloud Run service has the necessary IAM permissions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupCloudRunEnv(); 