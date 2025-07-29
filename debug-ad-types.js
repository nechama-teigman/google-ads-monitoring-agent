const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function debugAdTypes() {
  console.log('🔍 Starting ad type debug...');
  
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
    console.log(`🔍 Customer ID: ${credentials.customer_id}`);

    // Check the Dubai Visa ad group specifically
    const adGroupId = '169122249779';
    console.log(`\n📋 Checking ad group: Dubai Visa (ID: ${adGroupId})`);

    // Query 1: Get all ads with their types
    console.log('\n🔍 Query 1: All ads with types...');
    const allAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
    `;
    
    const allAds = await customer.query(allAdsQuery);
    console.log(`Found ${allAds.length} total ads`);
    
    // Group by ad type
    const adTypes = {};
    allAds.forEach(ad => {
      const type = ad.ad_group_ad.ad.type;
      if (!adTypes[type]) adTypes[type] = [];
      adTypes[type].push(ad);
    });
    
    console.log('\n📊 Ad types breakdown:');
    Object.keys(adTypes).forEach(type => {
      console.log(`   ${type}: ${adTypes[type].length} ads`);
    });

    // Query 2: Only ENABLED ads
    console.log('\n🔍 Query 2: Only ENABLED ads...');
    const enabledAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'ENABLED'
    `;
    
    const enabledAds = await customer.query(enabledAdsQuery);
    console.log(`Found ${enabledAds.length} ENABLED ads`);
    
    enabledAds.forEach((ad, index) => {
      const adStatus = ad.ad_group_ad.status;
      const approvalStatus = ad.ad_group_ad.policy_summary.approval_status;
      const adType = ad.ad_group_ad.ad.type;
      
      const approvalStatusText = approvalStatus === 1 ? 'APPROVED' : 
                               approvalStatus === 2 ? 'APPROVED_LIMITED' :
                               approvalStatus === 3 ? 'DISAPPROVED' :
                               approvalStatus === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
      
      console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}, Type: ${adType}, Approval: ${approvalStatus} (${approvalStatusText})`);
    });

    // Query 3: Only PAUSED ads
    console.log('\n🔍 Query 3: Only PAUSED ads...');
    const pausedAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'PAUSED'
    `;
    
    const pausedAds = await customer.query(pausedAdsQuery);
    console.log(`Found ${pausedAds.length} PAUSED ads`);
    
    pausedAds.forEach((ad, index) => {
      const adStatus = ad.ad_group_ad.status;
      const approvalStatus = ad.ad_group_ad.policy_summary.approval_status;
      const adType = ad.ad_group_ad.ad.type;
      
      const approvalStatusText = approvalStatus === 1 ? 'APPROVED' : 
                               approvalStatus === 2 ? 'APPROVED_LIMITED' :
                               approvalStatus === 3 ? 'DISAPPROVED' :
                               approvalStatus === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
      
      console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}, Type: ${adType}, Approval: ${approvalStatus} (${approvalStatusText})`);
    });

    // Query 4: Only REMOVED ads
    console.log('\n🔍 Query 4: Only REMOVED ads...');
    const removedAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'REMOVED'
    `;
    
    const removedAds = await customer.query(removedAdsQuery);
    console.log(`Found ${removedAds.length} REMOVED ads`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total ads: ${allAds.length}`);
    console.log(`   Enabled ads: ${enabledAds.length}`);
    console.log(`   Paused ads: ${pausedAds.length}`);
    console.log(`   Removed ads: ${removedAds.length}`);
    console.log(`   Active ads (enabled + paused): ${enabledAds.length + pausedAds.length}`);

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message || 'Unknown error');
    console.error('❌ Full error object:', error);
    console.error('Error details:', {
      message: error.message || 'No message',
      code: error.code || 'N/A',
      status: error.status || 'N/A'
    });
    
    if (error.errors && Array.isArray(error.errors)) {
      console.error('API Errors:');
      error.errors.forEach((err, i) => {
        console.error(`  ${i + 1}. ${err.message} (Code: ${err.code})`);
      });
    }
  }
}

// Run the debug
debugAdTypes().catch(console.error); 