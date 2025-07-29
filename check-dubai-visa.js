const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function checkDubaiVisa() {
  console.log('🔍 Checking Dubai Visa ad group specifically...\n');
  
  // Load credentials
  const fs = require('fs');
  const credentials = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
  
  // Initialize client
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
  
  // Check the Dubai Visa ad group specifically
  const dubaiVisaAdGroupId = '169122249779';
  
  console.log(`📋 Checking Dubai Visa ad group (${dubaiVisaAdGroupId})`);
  
  // First, check the ad group status
  const adGroupQuery = `
    SELECT 
      ad_group.id,
      ad_group.name,
      ad_group.status,
      campaign.id,
      campaign.name,
      campaign.status
    FROM ad_group 
    WHERE ad_group.id = ${dubaiVisaAdGroupId}
  `;
  
  try {
    const adGroupResult = await customer.query(adGroupQuery);
    if (adGroupResult && adGroupResult[0]) {
      const adGroup = adGroupResult[0];
      console.log(`📁 Ad Group: ${adGroup.ad_group.name}`);
      console.log(`   Status: ${adGroup.ad_group.status}`);
      console.log(`   Campaign: ${adGroup.campaign.name} (${adGroup.campaign.id})`);
      console.log(`   Campaign Status: ${adGroup.campaign.status}`);
      console.log('');
    }
  } catch (error) {
    console.error(`❌ Error checking ad group:`, error.message);
  }
  
  // Now check all ads in this ad group
  const adsQuery = `
    SELECT 
      ad_group_ad.ad.id,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.policy_topic_entries,
      ad_group_ad.resource_name
    FROM ad_group_ad 
    WHERE ad_group.id = ${dubaiVisaAdGroupId}
    ORDER BY ad_group_ad.ad.id
  `;
  
  try {
    const results = await customer.query(adsQuery);
    
    console.log(`📊 Found ${results.length} ads in Dubai Visa ad group:`);
    console.log('');
    
    let enabledCount = 0;
    let pausedCount = 0;
    let removedCount = 0;
    let approvedCount = 0;
    let disapprovedCount = 0;
    let limitedCount = 0;
    let underReviewCount = 0;
    
    results.forEach(ad => {
      const statusText = ad.ad_group_ad.status === 2 ? 'ENABLED' : 
                        ad.ad_group_ad.status === 3 ? 'PAUSED' : 
                        ad.ad_group_ad.status === 4 ? 'REMOVED' : 'UNKNOWN';
      
      const approvalText = ad.ad_group_ad.policy_summary.approval_status === 1 ? 'APPROVED' :
                          ad.ad_group_ad.policy_summary.approval_status === 2 ? 'APPROVED_LIMITED' :
                          ad.ad_group_ad.policy_summary.approval_status === 3 ? 'DISAPPROVED' :
                          ad.ad_group_ad.policy_summary.approval_status === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
      
      // Count statuses
      if (ad.ad_group_ad.status === 2) enabledCount++;
      else if (ad.ad_group_ad.status === 3) pausedCount++;
      else if (ad.ad_group_ad.status === 4) removedCount++;
      
      // Count approvals
      if (ad.ad_group_ad.policy_summary.approval_status === 1) approvedCount++;
      else if (ad.ad_group_ad.policy_summary.approval_status === 2) limitedCount++;
      else if (ad.ad_group_ad.policy_summary.approval_status === 3) disapprovedCount++;
      else if (ad.ad_group_ad.policy_summary.approval_status === 4) underReviewCount++;
      
      console.log(`   - Ad ID: ${ad.ad_group_ad.ad.id} | Status: ${statusText} | Approval: ${approvalText}`);
      
      // Show policy details for disapproved ads
      if (ad.ad_group_ad.policy_summary.approval_status === 3) {
        const policyEntries = ad.ad_group_ad.policy_summary.policy_topic_entries;
        if (policyEntries && policyEntries.length > 0) {
          console.log(`     ❌ Policy Issues: ${policyEntries.map(entry => entry.topic).join(', ')}`);
        }
      }
    });
    
    console.log('');
    console.log('📈 Summary:');
    console.log(`   Status Breakdown:`);
    console.log(`   - ENABLED: ${enabledCount} ads`);
    console.log(`   - PAUSED: ${pausedCount} ads`);
    console.log(`   - REMOVED: ${removedCount} ads`);
    console.log('');
    console.log(`   Approval Breakdown:`);
    console.log(`   - APPROVED: ${approvedCount} ads`);
    console.log(`   - APPROVED_LIMITED: ${limitedCount} ads`);
    console.log(`   - DISAPPROVED: ${disapprovedCount} ads`);
    console.log(`   - UNDER_REVIEW: ${underReviewCount} ads`);
    console.log('');
    
    // Check if there are any enabled ads that are not disapproved
    const enabledNonDisapproved = results.filter(ad => 
      ad.ad_group_ad.status === 2 && 
      ad.ad_group_ad.policy_summary.approval_status !== 3
    );
    
    console.log(`🔍 Enabled ads that are NOT disapproved: ${enabledNonDisapproved.length}`);
    if (enabledNonDisapproved.length > 0) {
      enabledNonDisapproved.forEach(ad => {
        const approvalText = ad.ad_group_ad.policy_summary.approval_status === 1 ? 'APPROVED' :
                            ad.ad_group_ad.policy_summary.approval_status === 2 ? 'APPROVED_LIMITED' :
                            ad.ad_group_ad.policy_summary.approval_status === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
        console.log(`   ✅ Ad ID: ${ad.ad_group_ad.ad.id} | Approval: ${approvalText}`);
      });
    } else {
      console.log(`   ❌ No enabled ads that are not disapproved found`);
    }
    
  } catch (error) {
    console.error(`❌ Error checking ads:`, error.message);
  }
}

checkDubaiVisa().catch(console.error); 