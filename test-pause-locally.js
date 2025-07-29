const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function testPauseLocally() {
  console.log('🔍 Starting local pause test...');
  
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

    // Test on the Urgent ad group which has 3 DISAPPROVED ads
    const adGroupId = '180986290705';
    console.log(`\n📋 Testing on ad group: Urgent (ID: ${adGroupId})`);

    // Step 1: Check all ads in the ad group first
    console.log('\n🔍 Step 1: Checking all ads in the ad group...');
    const allAdsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.resource_name
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'ENABLED'
    `;
    
    const allAds = await customer.query(allAdsQuery);
    console.log(`Found ${allAds.length} enabled ads:`);
    
    allAds.forEach((ad, index) => {
      const adStatus = ad.ad_group_ad.status;
      const approvalStatus = ad.ad_group_ad.policy_summary.approval_status;
      
      const statusText = adStatus === 2 ? 'ENABLED' :
                       adStatus === 3 ? 'PAUSED' :
                       adStatus === 4 ? 'REMOVED' : 'UNKNOWN';
      
      const approvalText = approvalStatus === 1 ? 'APPROVED' : 
                         approvalStatus === 2 ? 'APPROVED_LIMITED' :
                         approvalStatus === 3 ? 'DISAPPROVED' :
                         approvalStatus === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
      
      console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}`);
      console.log(`      Status: ${adStatus} (${statusText})`);
      console.log(`      Approval: ${approvalStatus} (${approvalText})`);
    });
    
    // Find a disapproved ad
    const disapprovedAd = allAds.find(ad => ad.ad_group_ad.policy_summary.approval_status === 3);
    if (!disapprovedAd) {
      console.log('❌ No disapproved ads found');
      return;
    }
    

    
    const adToPause = disapprovedAd;
    console.log(`✅ Found disapproved ad: ${adToPause.ad_group_ad.ad.id}`);
    console.log(`   Resource name: ${adToPause.ad_group_ad.resource_name}`);
    console.log(`   Current status: ${adToPause.ad_group_ad.status}`);

    // Step 2: Try to pause the ad
    console.log('\n🔍 Step 2: Attempting to pause the ad...');
    
    const updatePayload = {
      resource_name: adToPause.ad_group_ad.resource_name,
      status: 3, // PAUSED (corrected mapping)
    };

    console.log('🔍 Update payload:', JSON.stringify(updatePayload, null, 2));
    
    try {
      const result = await customer.adGroupAds.update(
        [updatePayload],
        {
          updateMask: 'status'
        }
      );
      
      console.log(`🔍 Update response:`, JSON.stringify(result, null, 2));

      // Step 3: Verify the pause worked
      console.log('\n🔍 Step 3: Verifying pause worked...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const verifyQuery = `
        SELECT 
          ad_group_ad.status,
          ad_group_ad.policy_summary.approval_status
        FROM ad_group_ad
        WHERE ad_group_ad.resource_name = '${adToPause.ad_group_ad.resource_name}'
      `;
      
      const verifyResult = await customer.query(verifyQuery);
      if (verifyResult && verifyResult[0]) {
        const newStatus = verifyResult[0].ad_group_ad.status;
        const approvalStatus = verifyResult[0].ad_group_ad.policy_summary.approval_status;
        
        const statusText = newStatus === 2 ? 'ENABLED' :
                         newStatus === 3 ? 'PAUSED' :
                         newStatus === 4 ? 'REMOVED' : 'UNKNOWN';
        
        console.log(`🔍 New status: ${newStatus} (${statusText})`);
        console.log(`🔍 Approval status: ${approvalStatus}`);
        
        if (newStatus === 3) {
          console.log('✅ SUCCESS: Ad was successfully paused!');
        } else {
          console.log('❌ FAILED: Ad was not paused');
        }
      }

    } catch (error) {
      console.error('❌ Error pausing ad:', error.message || 'Unknown error');
      console.error('❌ Full error details:', {
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

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message || 'Unknown error');
    console.error('❌ Full error object:', error);
  }
}

// Run the test
testPauseLocally().catch(console.error); 