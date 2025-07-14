const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function testGoogleAdsConnection() {
  console.log('🧪 Testing Google Ads API Connection...');
  console.log('📋 Environment Variables:');
  
  const requiredVars = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_REFRESH_TOKEN'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: MISSING`);
      allPresent = false;
    } else {
      console.log(`✅ ${varName}: SET`);
    }
  });
  
  if (!allPresent) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }
  
  try {
    console.log('🔧 Initializing Google Ads API client...');
    
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    
    console.log('✅ Google Ads API client created successfully');
    
    console.log('🔧 Creating customer client...');
    const customer = client.Customer({
      customer_id: '2080307721',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: '2558852824',
    });
    
    console.log('✅ Customer client created successfully');
    
    console.log('🔧 Testing simple query...');
    const query = `
      SELECT 
        customer.id,
        customer.descriptive_name
      FROM customer 
      LIMIT 1
    `;
    
    const results = await customer.query(query);
    console.log('✅ Query executed successfully');
    console.log('📊 Results:', results);
    
    console.log('✅ All tests passed! Google Ads API is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    });
    console.error('❌ Full error:', error);
    process.exit(1);
  }
}

testGoogleAdsConnection(); 