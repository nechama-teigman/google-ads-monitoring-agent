const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function checkCampaignStatus() {
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

    console.log('Checking campaign statuses...');
    const campaigns = await customer.query(`
      SELECT 
        campaign.id, 
        campaign.name, 
        campaign.status,
        campaign.serving_status
      FROM campaign
    `);
    
    console.log(`\nFound ${campaigns.length} total campaigns:`);
    campaigns.forEach(campaign => {
      const status = campaign.campaign.status;
      const servingStatus = campaign.campaign.serving_status;
      const emoji = status === 'ENABLED' ? '✅' : '⏸️';
      console.log(`${emoji} ${campaign.campaign.name}`);
      console.log(`   Status: ${status} | Serving: ${servingStatus}`);
      console.log(`   ID: ${campaign.campaign.id}\n`);
    });

    const enabledCampaigns = campaigns.filter(c => c.campaign.status === 'ENABLED');
    console.log(`📊 Summary: ${enabledCampaigns.length} enabled out of ${campaigns.length} total campaigns`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCampaignStatus();