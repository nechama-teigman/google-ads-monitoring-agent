const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function testApiMethods() {
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

    console.log('Available methods on customer.adGroupAds:');
    console.log(Object.getOwnPropertyNames(customer.adGroupAds));
    console.log('\nPrototype methods:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(customer.adGroupAds)));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testApiMethods();