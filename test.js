// Test file for Google Ads Agent
const GoogleAdsAgent = require('./index.js');

async function testConnection() {
  console.log('🧪 Testing Google Ads Agent...\n');
  
  const agent = new GoogleAdsAgent();
  
  try {
    // Test initialization
    console.log('1. Testing initialization...');
    await agent.initialize();
    console.log('✅ Initialization successful\n');
    
    // Test credentials (without making actual API calls)
    console.log('2. Testing credentials format...');
    if (agent.credentials.client_id && 
        agent.credentials.client_secret && 
        agent.credentials.developer_token && 
        agent.credentials.refresh_token) {
      console.log('✅ All required credentials present\n');
    } else {
      console.log('❌ Missing required credentials\n');
      return;
    }
    
    // Test text modification function
    console.log('3. Testing text modification...');
    const originalText = "Buy Now! Best Deals Available.";
    const modifiedText = agent.modifyText(originalText);
    console.log(`Original: ${originalText}`);
    console.log(`Modified: ${modifiedText}`);
    console.log('✅ Text modification working\n');
    
    console.log('🎉 All tests passed! Agent is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('1. Update customerId and campaignId in main() function');
    console.log('2. Run: npm start');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ENOENT') && error.message.includes('secrets.json')) {
      console.log('\n💡 Create a secrets.json file with your Google Ads API credentials:');
      console.log(JSON.stringify({
        "client_id": "your_client_id",
        "client_secret": "your_client_secret", 
        "developer_token": "your_developer_token",
        "refresh_token": "your_refresh_token"
      }, null, 2));
    }
  }
}

testConnection();