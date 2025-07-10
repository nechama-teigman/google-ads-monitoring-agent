const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

async function listAccessibleAccounts() {
  try {
    const secretsPath = path.join(__dirname, 'secrets.json');
    const secretsData = await fs.readFile(secretsPath, 'utf8');
    const credentials = JSON.parse(secretsData);

    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });

    // Use the MCC account for this query
    const customer = client.Customer({
      customer_id: credentials.login_customer_id,
      refresh_token: credentials.refresh_token,
      login_customer_id: credentials.login_customer_id,
    });

    const query = `
      SELECT customer_client.client_customer, customer_client.level, customer_client.descriptive_name
      FROM customer_client
      WHERE customer_client.level <= 1
    `;

    const results = await customer.query(query);
    if (results.length > 0) {
      console.log('Accessible accounts:');
      results.forEach(acc => {
        console.log(`- ${acc.customer_client.client_customer}: ${acc.customer_client.descriptive_name}`);
      });
    } else {
      console.log('No accessible accounts found.');
    }
  } catch (error) {
    console.error('❌ Error listing accounts:', error.message);
    if (error.errors) {
      console.error('Full error:', JSON.stringify(error.errors, null, 2));
    } else {
      console.error('Full error:', error);
    }
  }
}

listAccessibleAccounts(); 