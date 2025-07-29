const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function checkResults() {
  console.log('🔍 Checking what happened to the ads...\n');
  
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
  
  // Check the specific ad groups we worked on
  const adGroups = [
    { id: '180986290705', name: 'Urgent' },
    { id: '185215565401', name: 'Family' },
    { id: '181499073573', name: 'Ad group 1' },
    { id: '186771837350', name: 'Ad group 1' }
  ];
  
  for (const adGroup of adGroups) {
    console.log(`📋 Checking ad group: ${adGroup.name} (${adGroup.id})`);
    
    const query = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.resource_name
      FROM ad_group_ad 
      WHERE ad_group.id = ${adGroup.id}
      ORDER BY ad_group_ad.ad.id
    `;
    
    try {
      const results = await customer.query(query);
      
      console.log(`   Found ${results.length} ads:`);
      
      results.forEach(ad => {
        const statusText = ad.ad_group_ad.status === 2 ? 'ENABLED' : 
                          ad.ad_group_ad.status === 3 ? 'PAUSED' : 
                          ad.ad_group_ad.status === 4 ? 'REMOVED' : 'UNKNOWN';
        
        const approvalText = ad.ad_group_ad.policy_summary.approval_status === 1 ? 'APPROVED' :
                            ad.ad_group_ad.policy_summary.approval_status === 2 ? 'APPROVED_LIMITED' :
                            ad.ad_group_ad.policy_summary.approval_status === 3 ? 'DISAPPROVED' :
                            ad.ad_group_ad.policy_summary.approval_status === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
        
        console.log(`   - Ad ID: ${ad.ad_group_ad.ad.id} | Status: ${statusText} | Approval: ${approvalText}`);
      });
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error checking ad group ${adGroup.id}:`, error.message);
    }
  }
  
  console.log('💡 TIP: In Google Ads interface, change the "Status" filter to "All" to see paused ads');
  console.log('💡 The new ads (with higher IDs) should appear as "Active" in the main view');
}

checkResults().catch(console.error); 