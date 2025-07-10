const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function testBasicConnection() {
  try {
    console.log('Loading credentials...');
    const secretsData = await fs.readFile('./secrets.json', 'utf8');
    const credentials = JSON.parse(secretsData);

    console.log('Creating client...');
    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });

    console.log('Creating customer client...');
    const customer = client.Customer({
      customer_id: '2080307721',
      refresh_token: credentials.refresh_token,
      login_customer_id: '2558852824',
    });

    console.log('Testing basic campaign query...');
    const campaigns = await customer.query('SELECT campaign.id, campaign.name FROM campaign LIMIT 5');
    console.log('✅ Success! Found campaigns:', campaigns.length);
    campaigns.forEach(campaign => {
      console.log(`  Campaign: ${campaign.campaign.name} (${campaign.campaign.id})`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testBasicConnection();