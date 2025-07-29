const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');

async function testDuplicateLocally() {
  console.log('🔍 Starting local duplicate test...');
  
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
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
    `;
    
    const allAds = await customer.query(countQuery);
    console.log(`Total ads in ad group: ${allAds.length}`);
    
    const enabledAds = allAds.filter(ad => ad.ad_group_ad.status === 2);
    const pausedAds = allAds.filter(ad => ad.ad_group_ad.status === 3);
    const removedAds = allAds.filter(ad => ad.ad_group_ad.status === 4);
    
    console.log(`   Enabled ads: ${enabledAds.length}`);
    console.log(`   Paused ads: ${pausedAds.length}`);
    console.log(`   Removed ads: ${removedAds.length}`);
    
    // Count by approval status
    const approvedAds = allAds.filter(ad => ad.ad_group_ad.policy_summary.approval_status === 1);
    const limitedAds = allAds.filter(ad => ad.ad_group_ad.policy_summary.approval_status === 2);
    const disapprovedAds = allAds.filter(ad => ad.ad_group_ad.policy_summary.approval_status === 3);
    
    console.log(`   Approved ads: ${approvedAds.length}`);
    console.log(`   Limited ads: ${limitedAds.length}`);
    console.log(`   Disapproved ads: ${disapprovedAds.length}`);

    // Step 2: Find a paused disapproved ad to duplicate
    console.log('\n🔍 Step 2: Finding a paused disapproved ad...');
    const pausedDisapprovedAd = allAds.find(ad => 
      ad.ad_group_ad.status === 3 && 
      ad.ad_group_ad.policy_summary.approval_status === 3
    );
    
    if (!pausedDisapprovedAd) {
      console.log('❌ No paused disapproved ads found');
      return;
    }
    
    console.log(`✅ Found paused disapproved ad: ${pausedDisapprovedAd.ad_group_ad.ad.id}`);

    // Step 3: Check ad group limits before duplicating
    console.log('\n🔍 Step 3: Checking ad group limits...');
    if (enabledAds.length >= 3) {
      console.log(`⚠️  Skipping duplicate: Ad group ${adGroupId} already has ${enabledAds.length} enabled ads (limit is 3).`);
      console.log(`⚠️  This ad group cannot accept more ads. Consider pausing some existing ads first.`);
      return;
    }
    
    console.log(`✅ Ad group ${adGroupId} has ${enabledAds.length} enabled ads - proceeding with duplication`);

    // Step 4: Try to duplicate the ad
    console.log('\n🔍 Step 4: Attempting to duplicate the ad...');
    
    try {
      // Get the ad details for duplication
      const adDetailsQuery = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.ad.expanded_text_ad.headline_part1,
          ad_group_ad.ad.expanded_text_ad.headline_part2,
          ad_group_ad.ad.expanded_text_ad.description,
          ad_group_ad.ad.expanded_text_ad.description2,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.final_mobile_urls,
          ad_group_ad.policy_summary.policy_topic_entries,
          ad_group.id
        FROM ad_group_ad 
        WHERE ad_group_ad.ad.id = ${pausedDisapprovedAd.ad_group_ad.ad.id}
      `;
      
      const adDetails = await customer.query(adDetailsQuery);
      if (!adDetails || adDetails.length === 0) {
        console.log('❌ Could not get ad details');
        return;
      }
      
      const ad = adDetails[0];
      console.log(`🔍 Ad details retrieved for duplication`);
      console.log(`🔍 Ad type: ${ad.ad_group_ad.ad.type}`);
      console.log(`🔍 Ad data:`, JSON.stringify(ad.ad_group_ad.ad, null, 2));
      
      // Create the duplicate ad based on type
      let duplicateAd = {};
      
      if (ad.ad_group_ad.ad.type === 'EXPANDED_TEXT_AD' || ad.ad_group_ad.ad.type === 3) {
        console.log(`🔧 Creating expanded text ad...`);
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
        console.log(`🔧 Creating responsive search ad...`);
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
      } else {
        console.log(`❌ Unsupported ad type: ${ad.ad_group_ad.ad.type}`);
        return;
      }
      
      console.log('🔍 Creating duplicate ad...');
      console.log('🔍 Duplicate payload:', JSON.stringify(duplicateAd, null, 2));
      const result = await customer.adGroupAds.create([duplicateAd]);
      
      console.log(`🔍 Duplicate result:`, JSON.stringify(result, null, 2));
      
      if (result && result.results && result.results.length > 0) {
        console.log('✅ SUCCESS: Ad was successfully duplicated!');
        console.log(`   New ad ID: ${result.results[0].resource_name}`);
      } else {
        console.log('❌ FAILED: Ad was not duplicated');
      }

    } catch (error) {
      console.error('❌ Error duplicating ad:', error.message || 'Unknown error');
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
testDuplicateLocally().catch(console.error); 