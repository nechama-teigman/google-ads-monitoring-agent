// Script to create secrets.json file
const fs = require('fs').promises;
const path = require('path');

async function createSecretsFile() {
  try {
    console.log('🔑 Creating secrets.json file...\n');
    
    // Read client_secret.json
    const clientSecretPath = path.join(__dirname, 'client_secret.json');
    const clientSecretData = await fs.readFile(clientSecretPath, 'utf8');
    const clientSecret = JSON.parse(clientSecretData);
    
    console.log('✅ Found client_secret.json');
    console.log(`📋 Client ID: ${clientSecret.installed.client_id}`);
    console.log(`📋 Client Secret: ${clientSecret.installed.client_secret}`);
    console.log(`📋 Project ID: ${clientSecret.installed.project_id}`);
    
    // Create secrets.json structure
    const secrets = {
      client_id: clientSecret.installed.client_id,
      client_secret: clientSecret.installed.client_secret,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'YOUR_DEVELOPER_TOKEN_HERE',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE',
      customer_id: '2080307721',
      login_customer_id: '2558852824'
    };
    
    // Write secrets.json file
    const secretsPath = path.join(__dirname, 'secrets.json');
    await fs.writeFile(secretsPath, JSON.stringify(secrets, null, 2));
    
    console.log('\n✅ Created secrets.json file');
    console.log('📝 You need to update the following values in secrets.json:');
    console.log('   - developer_token: Get from Google Ads API Center');
    console.log('   - refresh_token: Get by running OAuth flow');
    
    console.log('\n🔧 Next steps:');
    console.log('1. Go to Google Ads API Center: https://developers.google.com/google-ads/api/docs/first-call/dev-token');
    console.log('2. Get your Developer Token');
    console.log('3. Update the developer_token value in secrets.json');
    console.log('4. Get your Refresh Token and update refresh_token value');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSecretsFile(); 