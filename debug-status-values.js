const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function debugStatusValues() {
  console.log('🔍 Starting status value debug...');
  
  try {
    // Load credentials from secrets.json
    const credentials = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
    
    // Initialize the API client
    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });

    const customer = client.Customer({
      customer_id: credentials.customer_id,
      refresh_token: credentials.refresh_token,
      login_customer_id: credentials.login_customer_id,
    });

    console.log('✅ API client initialized');

    // Check the Dubai Visa ad group specifically
    const adGroupId = '169122249779';
    console.log(`\n📋 Checking ad group: Dubai Visa (ID: ${adGroupId})`);

    // Query 1: Get all ads with raw status values
    console.log('\n🔍 Query 1: All ads with raw status values...');
    const allAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
      LIMIT 10
    `;
    
    const allAds = await customer.query(allAdsQuery);
    console.log(`Found ${allAds.length} ads (showing first 10):`);
    
    allAds.forEach((ad, index) => {
      const adStatus = ad.ad_group_ad.status;
      const approvalStatus = ad.ad_group_ad.policy_summary.approval_status;
      
      console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}`);
      console.log(`      Raw Status: ${adStatus} (type: ${typeof adStatus})`);
      console.log(`      Raw Approval: ${approvalStatus} (type: ${typeof approvalStatus})`);
    });

    // Query 2: Test different status filters
    console.log('\n🔍 Query 2: Testing status filters...');
    
    const statusTests = [
      { name: 'ENABLED', filter: "ad_group_ad.status = 'ENABLED'" },
      { name: 'PAUSED', filter: "ad_group_ad.status = 'PAUSED'" },
      { name: 'REMOVED', filter: "ad_group_ad.status = 'REMOVED'" },
      { name: 'Status 1', filter: "ad_group_ad.status = 1" },
      { name: 'Status 2', filter: "ad_group_ad.status = 2" },
      { name: 'Status 3', filter: "ad_group_ad.status = 3" }
    ];
    
    for (const test of statusTests) {
      const testQuery = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.status
        FROM ad_group_ad
        WHERE ad_group.id = ${adGroupId}
          AND ${test.filter}
        LIMIT 5
      `;
      
      try {
        const results = await customer.query(testQuery);
        console.log(`   ${test.name}: ${results.length} ads`);
        if (results.length > 0) {
          console.log(`      Sample status: ${results[0].ad_group_ad.status}`);
        }
      } catch (error) {
        console.log(`   ${test.name}: Error - ${error.message}`);
      }
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message || 'Unknown error');
    console.error('❌ Full error object:', error);
  }
}

// Run the debug
debugStatusValues().catch(console.error); 