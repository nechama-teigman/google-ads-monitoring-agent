const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function testPauseAndDuplicate() {
  console.log('🔍 Starting pause and duplicate test...');
  
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

    // Test on the Urgent ad group
    const adGroupId = '180986290705';
    console.log(`\n📋 Testing on ad group: Urgent (ID: ${adGroupId})`);

    // Step 1: Check current ad counts
    console.log('\n🔍 Step 1: Checking current ad counts...');
    const countQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.resource_name
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
    `;
    
    const allAds = await customer.query(countQuery);
    console.log(`Total ads in ad group: ${allAds.length}`);
    
    const enabledAds = allAds.filter(ad => ad.ad_group_ad.status === 2);
    const pausedAds = allAds.filter(ad => ad.ad_group_ad.status === 3);
    
    console.log(`   Enabled ads: ${enabledAds.length}`);
    console.log(`   Paused ads: ${pausedAds.length}`);
    
    // Step 2: Find a disapproved enabled ad to pause first
    console.log('\n🔍 Step 2: Finding a disapproved enabled ad to pause...');
    const disapprovedEnabledAd = enabledAds.find(ad => 
      ad.ad_group_ad.policy_summary.approval_status === 3
    );
    
    if (!disapprovedEnabledAd) {
      console.log('❌ No disapproved enabled ads found to pause');
      return;
    }
    
    console.log(`✅ Found disapproved enabled ad: ${disapprovedEnabledAd.ad_group_ad.ad.id}`);

    // Step 3: Pause the disapproved enabled ad
    console.log('\n🔍 Step 3: Pausing the disapproved enabled ad...');
    
    const updatePayload = {
      resource_name: disapprovedEnabledAd.ad_group_ad.resource_name,
      status: 3, // PAUSED
    };

    try {
      const pauseResult = await customer.adGroupAds.update(
        [updatePayload],
        {
          updateMask: 'status'
        }
      );
      
      console.log(`✅ Ad paused successfully`);
      
      // Wait a moment for the change to propagate
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 4: Check counts again
      console.log('\n🔍 Step 4: Checking counts after pause...');
      const newAllAds = await customer.query(countQuery);
      const newEnabledAds = newAllAds.filter(ad => ad.ad_group_ad.status === 2);
      const newPausedAds = newAllAds.filter(ad => ad.ad_group_ad.status === 3);
      
      console.log(`   Enabled ads: ${newEnabledAds.length}`);
      console.log(`   Paused ads: ${newPausedAds.length}`);
      
      // Step 5: Now try to duplicate a paused disapproved ad
      if (newEnabledAds.length < 3) {
        console.log('\n🔍 Step 5: Attempting to duplicate a paused disapproved ad...');
        
        const pausedDisapprovedAd = newPausedAds.find(ad => 
          ad.ad_group_ad.policy_summary.approval_status === 3
        );
        
        if (pausedDisapprovedAd) {
          console.log(`✅ Found paused disapproved ad to duplicate: ${pausedDisapprovedAd.ad_group_ad.ad.id}`);
          
          // Get ad details for duplication
          const adDetailsQuery = `
            SELECT 
              ad_group_ad.ad.id,
              ad_group_ad.ad.type,
              ad_group_ad.ad.expanded_text_ad.headline_part1,
              ad_group_ad.ad.expanded_text_ad.headline_part2,
              ad_group_ad.ad.expanded_text_ad.description,
              ad_group_ad.ad.responsive_search_ad.headlines,
              ad_group_ad.ad.responsive_search_ad.descriptions,
              ad_group_ad.ad.final_urls,
              ad_group.id
            FROM ad_group_ad 
            WHERE ad_group_ad.ad.id = ${pausedDisapprovedAd.ad_group_ad.ad.id}
          `;
          
          const adDetails = await customer.query(adDetailsQuery);
          const ad = adDetails[0];
          
          // Create duplicate based on type
          let duplicateAd = {};
          
          if (ad.ad_group_ad.ad.type === 'EXPANDED_TEXT_AD' || ad.ad_group_ad.ad.type === 3) {
            duplicateAd = {
              ad_group: `customers/${credentials.customer_id}/adGroups/${ad.ad_group.id}`,
              ad: {
                expanded_text_ad: {
                  headline_part1: ad.ad_group_ad.ad.expanded_text_ad.headline_part1,
                  headline_part2: ad.ad_group_ad.ad.expanded_text_ad.headline_part2,
                  description: ad.ad_group_ad.ad.expanded_text_ad.description,
                },
                final_urls: ad.ad_group_ad.ad.final_urls
              },
              status: 'ENABLED'
            };
          } else if (ad.ad_group_ad.ad.type === 'RESPONSIVE_SEARCH_AD' || ad.ad_group_ad.ad.type === 15) {
            duplicateAd = {
              ad_group: `customers/${credentials.customer_id}/adGroups/${ad.ad_group.id}`,
              ad: {
                responsive_search_ad: {
                  headlines: ad.ad_group_ad.ad.responsive_search_ad.headlines.map(h => {
                    const obj = { text: h.text };
                    if (h.pinned_field !== undefined && h.pinned_field !== null) obj.pinned_field = h.pinned_field;
                    return obj;
                  }),
                  descriptions: ad.ad_group_ad.ad.responsive_search_ad.descriptions.map(d => {
                    const obj = { text: d.text };
                    if (d.pinned_field !== undefined && d.pinned_field !== null) obj.pinned_field = d.pinned_field;
                    return obj;
                  })
                },
                final_urls: ad.ad_group_ad.ad.final_urls
              },
              status: 'ENABLED'
            };
          }
          
          console.log('🔍 Creating duplicate ad...');
          const duplicateResult = await customer.adGroupAds.create([duplicateAd]);
          
          if (duplicateResult && duplicateResult.results && duplicateResult.results.length > 0) {
            console.log('✅ SUCCESS: Ad was successfully duplicated!');
            console.log(`   New ad ID: ${duplicateResult.results[0].resource_name}`);
          } else {
            console.log('❌ FAILED: Ad was not duplicated');
          }
        } else {
          console.log('❌ No paused disapproved ads found to duplicate');
        }
      } else {
        console.log('❌ Still have 3 enabled ads, cannot duplicate');
      }
      
    } catch (error) {
      console.error('❌ Error during pause/duplicate process:', error.message || 'Unknown error');
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message || 'Unknown error');
    console.error('❌ Full error object:', error);
  }
}

// Run the test
testPauseAndDuplicate().catch(console.error); 