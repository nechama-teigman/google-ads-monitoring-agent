// Simple test to find disapproved ads
const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

async function testFindDisapproved() {
  try {
    console.log('🔧 Loading credentials...');
    
    const secretsPath = path.join(__dirname, 'secrets.json');
    const secretsData = await fs.readFile(secretsPath, 'utf8');
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

    console.log('🔍 Finding all ads with policy issues...');
    
    const query = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.resource_name,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        campaign.status,
        ad_group_ad.status
      FROM ad_group_ad 
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      AND ad_group.status IN ('ENABLED', 'PAUSED')
      AND ad_group_ad.status IN ('ENABLED', 'PAUSED')
      AND campaign.name LIKE '%AMG%'
      LIMIT 100
    `;

    const results = await customer.query(query);
    console.log(`📊 Found ${results.length} ads in AMG campaigns`);
    
    // Filter for disapproved ads
    const disapprovedAds = results.filter(ad => {
      const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
      return approvalStatus === 3; // Only DISAPPROVED
    });
    
    console.log(`🔍 Found ${disapprovedAds.length} DISAPPROVED ads in AMG campaigns:`);
    
    disapprovedAds.forEach((ad, index) => {
      console.log(`\n${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}`);
      console.log(`   Campaign: ${ad.campaign.name} (${ad.campaign.id})`);
      console.log(`   Ad Group: ${ad.ad_group.name} (${ad.ad_group.id})`);
      console.log(`   Status: ${ad.ad_group_ad.status}`);
      console.log(`   Approval Status: ${ad.ad_group_ad.policy_summary.approval_status} (DISAPPROVED)`);
      console.log(`   Resource Name: ${ad.ad_group_ad.resource_name}`);
    });
    
    if (disapprovedAds.length === 0) {
      console.log('❌ No disapproved ads found in AMG campaigns');
    } else {
      console.log(`\n✅ Found ${disapprovedAds.length} disapproved ads to process`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFindDisapproved(); 