const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;

async function checkAdStatuses() {
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

    console.log('Checking actual ad approval statuses...');
    const ads = await customer.query(`
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.policy_summary.review_status,
        ad_group_ad.status,
        ad_group.name,
        campaign.name,
        campaign.status
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
      AND ad_group_ad.status = 'ENABLED'
    `);
    
    console.log(`\nFound ${ads.length} enabled ads:`);
    ads.forEach(ad => {
      const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status || 'NO_POLICY_DATA';
      const reviewStatus = ad.ad_group_ad?.policy_summary?.review_status || 'NO_REVIEW_DATA';
      const adStatus = ad.ad_group_ad?.status || 'UNKNOWN';
      
      console.log(`\n📋 Campaign: ${ad.campaign.name}`);
      console.log(`   Ad Group: ${ad.ad_group.name}`);
      console.log(`   Ad ID: ${ad.ad_group_ad.ad.id}`);
      console.log(`   Ad Status: ${adStatus}`);
      console.log(`   Approval Status: ${approvalStatus}`);
      console.log(`   Review Status: ${reviewStatus}`);
    });
    
    // Group by approval status
    const statusGroups = {};
    ads.forEach(ad => {
      const status = ad.ad_group_ad?.policy_summary?.approval_status || 'NO_POLICY_DATA';
      if (!statusGroups[status]) statusGroups[status] = 0;
      statusGroups[status]++;
    });
    
    console.log('\n📊 Approval Status Summary:');
    Object.keys(statusGroups).forEach(status => {
      console.log(`   ${status}: ${statusGroups[status]} ads`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdStatuses();