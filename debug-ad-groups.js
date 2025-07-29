const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function debugAdGroups() {
  console.log('🔍 Starting ad group debug...');
  
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

    // Step 1: List all campaigns
    console.log('\n📋 Step 1: Listing all campaigns...');
    const campaignsQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      WHERE campaign.status = 'ENABLED'
    `;
    
    const campaigns = await customer.query(campaignsQuery);
    console.log(`Found ${campaigns.length} enabled campaigns:`);
    campaigns.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.campaign.name} (ID: ${campaign.campaign.id})`);
    });

    // Step 2: Find the Dubai campaign
    console.log('\n📋 Step 2: Looking for Dubai campaign...');
    const dubaiCampaign = campaigns.find(c => c.campaign.name.toLowerCase().includes('dubai'));
    if (!dubaiCampaign) {
      console.log('❌ No Dubai campaign found');
      return;
    }
    
    console.log(`✅ Found Dubai campaign: ${dubaiCampaign.campaign.name} (ID: ${dubaiCampaign.campaign.id})`);

    // Step 3: List all ad groups in the Dubai campaign
    console.log('\n📋 Step 3: Listing ad groups in Dubai campaign...');
    const adGroupsQuery = `
      SELECT 
        ad_group.id,
        ad_group.name,
        ad_group.status
      FROM ad_group
      WHERE campaign.id = ${dubaiCampaign.campaign.id}
        AND ad_group.status = 'ENABLED'
    `;
    
    const adGroups = await customer.query(adGroupsQuery);
    console.log(`Found ${adGroups.length} enabled ad groups:`);
    adGroups.forEach((adGroup, index) => {
      console.log(`   ${index + 1}. ${adGroup.ad_group.name} (ID: ${adGroup.ad_group.id})`);
    });

    // Step 4: Check each ad group for ads
    console.log('\n📋 Step 4: Checking ads in each ad group...');
    for (const adGroup of adGroups) {
      console.log(`\n🔍 Checking ad group: ${adGroup.ad_group.name} (ID: ${adGroup.ad_group.id})`);
      
      const adsQuery = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.status,
          ad_group_ad.policy_summary.approval_status
        FROM ad_group_ad
        WHERE ad_group.id = ${adGroup.ad_group.id}
          AND ad_group_ad.status = 'ENABLED'
      `;
      
      try {
        const ads = await customer.query(adsQuery);
        console.log(`   Found ${ads.length} ads in this ad group:`);
        
        ads.forEach((ad, index) => {
          const adStatus = ad.ad_group_ad.status;
          const approvalStatus = ad.ad_group_ad.policy_summary.approval_status;
          
          const adStatusText = adStatus === 2 ? 'ENABLED' :
                             adStatus === 3 ? 'PAUSED' :
                             adStatus === 4 ? 'REMOVED' : 'UNKNOWN';
          
          const approvalStatusText = approvalStatus === 1 ? 'APPROVED' : 
                                   approvalStatus === 2 ? 'APPROVED_LIMITED' :
                                   approvalStatus === 3 ? 'DISAPPROVED' :
                                   approvalStatus === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
          
          console.log(`     ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}`);
          console.log(`        Status: ${adStatus} (${adStatusText})`);
          console.log(`        Approval: ${approvalStatus} (${approvalStatusText})`);
        });
        
        if (ads.length > 3) {
          console.log(`   ⚠️  WARNING: This ad group has ${ads.length} ads (should be max 3)!`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error querying ads for ad group ${adGroup.ad_group.id}:`, error.message);
      }
    }

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
debugAdGroups().catch(console.error); 