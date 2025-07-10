const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function testCreateAd() {
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

    console.log('Testing ad creation API...');
    
    // First, let's just try to get one ad's details
    const testQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.expanded_text_ad.headline_part1,
        ad_group_ad.ad.expanded_text_ad.headline_part2,
        ad_group_ad.ad.expanded_text_ad.description,
        ad_group_ad.ad.final_urls,
        ad_group.id,
        ad_group.name,
        campaign.name
      FROM ad_group_ad
      WHERE campaign.name = 'Mumbai'
      LIMIT 1
    `;
    
    const ads = await customer.query(testQuery);
    console.log('✅ Found ad details:', ads[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
  }
}

testCreateAd();