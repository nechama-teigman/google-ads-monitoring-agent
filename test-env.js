// Test script to verify environment variables for Railway deployment
require('dotenv').config();

console.log('🔍 Testing environment variables for Railway deployment...');
console.log('');

const requiredVars = [
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET', 
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'OPENAI_API_KEY'
];

console.log('📋 Required environment variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
  }
});

console.log('');
console.log('🔧 Optional environment variables:');
const optionalVars = [
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_MCC_ID',
  'PORT'
];

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (using default)`);
  }
});

console.log('');
console.log('🌐 Network connectivity test...');

// Test basic network connectivity
const https = require('https');
const testUrl = 'https://oauth2.googleapis.com';

const req = https.get(testUrl, (res) => {
  console.log(`✅ Network connectivity: ${res.statusCode} - ${res.statusMessage}`);
  process.exit(0);
});

req.on('error', (error) => {
  console.log(`❌ Network connectivity failed: ${error.message}`);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.log('❌ Network connectivity timeout');
  req.destroy();
  process.exit(1);
}); 