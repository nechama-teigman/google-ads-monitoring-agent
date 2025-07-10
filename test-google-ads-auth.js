const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

async function testGoogleAdsAuth() {
  try {
    const secretsPath = path.join(__dirname, 'secrets.json');
    const secretsData = await fs.readFile(secretsPath, 'utf8');
    const credentials = JSON.parse(secretsData);

    // Mask the developer token for logging
    const maskedToken = credentials.developer_token
      ? credentials.developer_token.slice(0, 4) + '...' + credentials.developer_token.slice(-4)
      : 'undefined';

    console.log(`Using developer token: ${maskedToken}`);

    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });

    const customer = client.Customer({
      customer_id: credentials.customer_id,
      refresh_token: credentials.refresh_token,
      login_customer_id: credentials.login_customer_id
    });

    // Simple query: get all campaigns (id, name, status)
    const query = `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
    `;

    const results = await customer.query(query);
    // Print raw API results for debugging
    console.log('Raw API results:', JSON.stringify(results, null, 2));
    if (results.length > 0) {
      console.log('Campaigns found:');
      results.forEach(c => {
        console.log(`- ${c.campaign.id}: ${c.campaign.name} [${c.campaign.status}]`);
      });
    } else {
      console.log('No campaigns found.');
    }
  } catch (error) {
    console.error('❌ Authentication or API error:', error.message);
    if (error.errors) {
      console.error('Full error:', JSON.stringify(error.errors, null, 2));
    } else {
      console.error('Full error:', error);
    }
  }
}

testGoogleAdsAuth(); 