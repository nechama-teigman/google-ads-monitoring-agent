const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function checkEnabledCampaigns() {
  try {
    const secretsData = await fs.readFile('./secrets.json', 'utf8');
    const credentials = JSON.parse(secretsData);

    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });

    const customer = client.Customer({
      customer_id: '2080307721',
      refresh_token: credentials.refresh_token,
      login_customer_id: '2558852824',
    });

    console.log('Checking for ENABLED campaigns specifically...');
    const campaigns = await customer.query(`
      SELECT 
        campaign.id, 
        campaign.name, 
        campaign.status
      FROM campaign
      WHERE campaign.status = 'ENABLED'
    `);
    
    console.log(`\nFound ${campaigns.length} ENABLED campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`✅ ${campaign.campaign.name} (${campaign.campaign.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEnabledCampaigns();