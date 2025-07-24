// Debug script to test ad counting and pausing logic
const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

class DebugAgent {
  constructor() {
    this.client = null;
    this.credentials = null;
    this.lastApiCall = 0;
    this.minApiInterval = 2000;
  }

  async initialize() {
    try {
      console.log('🔧 Loading credentials from secrets.json...');
      
      const secretsPath = path.join(__dirname, 'secrets.json');
      const secretsData = await fs.readFile(secretsPath, 'utf8');
      const credentials = JSON.parse(secretsData);
      
      this.credentials = {
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        developer_token: credentials.developer_token,
        refresh_token: credentials.refresh_token,
      };

      console.log('✅ All credentials present');
      console.log('🔧 Initializing Google Ads API client...');

      this.client = new GoogleAdsApi({
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        developer_token: this.credentials.developer_token,
      });

      console.log('✅ Google Ads Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.minApiInterval) {
      const waitTime = this.minApiInterval - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next API call...`);
      await this.sleep(waitTime);
    }
    
    this.lastApiCall = Date.now();
  }

  async getCustomerClient(customerId) {
    return this.client.Customer({
      customer_id: customerId,
      refresh_token: this.credentials.refresh_token,
      login_customer_id: '2558852824',
    });
  }

  async countEnabledAdsInAdGroup(customerId, adGroupId) {
    await this.rateLimit();
    const customer = await this.getCustomerClient(customerId);
    const query = `
      SELECT 
        ad_group_ad.status, 
        ad_group_ad.ad.id,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'ENABLED'
    `;
    try {
      const results = await customer.query(query);
      
      // Count ALL enabled ads (Google Ads counts all enabled ads toward the 3-ad limit)
      const enabledAds = results.filter(ad => {
        return ad.ad_group_ad?.status === 'ENABLED';
      });
      
      console.log(`🔍 Ad group ${adGroupId} has ${results.length} enabled ads total:`);
      results.forEach((ad, index) => {
        const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
        const statusText = approvalStatus === 1 ? 'APPROVED' : 
                          approvalStatus === 2 ? 'APPROVED_LIMITED' :
                          approvalStatus === 3 ? 'DISAPPROVED' :
                          approvalStatus === 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
        console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}, Status: ${ad.ad_group_ad.status}, Approval: ${approvalStatus} (${statusText})`);
      });
      
      console.log(`✅ Ad group ${adGroupId} has ${enabledAds.length} ENABLED ads (can accept ${3 - enabledAds.length} more)`);
      
      return enabledAds.length;
    } catch (error) {
      console.error('❌ Error counting ads in ad group:', error.message);
      throw error;
    }
  }

  async pauseDisapprovedAd(customerId, adResourceName) {
    console.log(`🔧 PAUSE FUNCTION STARTED for ad: ${adResourceName}`);
    
    await this.rateLimit();
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const updateData = {
        resource_name: adResourceName,
        status: 'PAUSED'
      };

      console.log(`🔧 About to call adGroupAds.update with:`, updateData);
      
      const result = await customer.adGroupAds.update([updateData]);
      console.log(`🔧 Update result:`, result);
      console.log(`⏸️  Paused disapproved ad: ${adResourceName}`);
    } catch (error) {
      console.error('❌ Error pausing ad:', error.message);
      console.error('❌ Full pause error:', error);
      throw error;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async debugAdGroup(customerId, adGroupId) {
    console.log(`\n🔍 DEBUGGING AD GROUP ${adGroupId}`);
    console.log('=' * 50);
    
    // Check initial ad count
    console.log('\n📊 STEP 1: Initial ad count');
    const initialCount = await this.countEnabledAdsInAdGroup(customerId, adGroupId);
    
    // Find a disapproved ad to test with
    console.log('\n📊 STEP 2: Finding disapproved ads in this ad group');
    await this.rateLimit();
    const customer = await this.getCustomerClient(customerId);
    const query = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.resource_name,
        ad_group_ad.status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.policy_summary.approval_status = 3
        AND ad_group_ad.status = 'ENABLED'
    `;
    
    const disapprovedAds = await customer.query(query);
    console.log(`Found ${disapprovedAds.length} disapproved ads in ad group ${adGroupId}`);
    
    if (disapprovedAds.length === 0) {
      console.log('❌ No disapproved ads found in this ad group');
      return;
    }
    
    // Test with the first disapproved ad
    const testAd = disapprovedAds[0];
    console.log(`\n🧪 TESTING WITH AD: ${testAd.ad_group_ad.ad.id}`);
    console.log(`   Resource Name: ${testAd.ad_group_ad.resource_name}`);
    console.log(`   Status: ${testAd.ad_group_ad.status}`);
    console.log(`   Approval Status: ${testAd.ad_group_ad.policy_summary.approval_status}`);
    
    // Pause the ad
    console.log('\n📊 STEP 3: Pausing the disapproved ad');
    await this.pauseDisapprovedAd(customerId, testAd.ad_group_ad.resource_name);
    
    // Wait for pause to take effect
    console.log('\n⏳ Waiting 5 seconds for pause to take effect...');
    await this.sleep(5000);
    
    // Check ad count after pausing
    console.log('\n📊 STEP 4: Ad count after pausing');
    const countAfterPause = await this.countEnabledAdsInAdGroup(customerId, adGroupId);
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Initial count: ${initialCount} enabled ads`);
    console.log(`   After pause: ${countAfterPause} enabled ads`);
    console.log(`   Difference: ${initialCount - countAfterPause} ads`);
    
    if (countAfterPause < initialCount) {
      console.log('✅ SUCCESS: Pausing worked - ad count decreased');
    } else {
      console.log('❌ ISSUE: Pausing did not work - ad count did not decrease');
    }
  }
}

async function main() {
  const agent = new DebugAgent();
  
  try {
    await agent.initialize();
    
    const customerId = '2080307721';
    
    // Debug the specific ad groups that have disapproved ads
    console.log('\n🔍 DEBUGGING AD GROUPS WITH DISAPPROVED ADS');
    
    // From the earlier output, we know these ad groups have disapproved ads:
    // - Ad Group ID: 169122249779 (Urgent ad group in AMG - Dubai - Dubai Visa)
    // - Ad Group ID: 169122249779 (Family ad group in AMG - Dubai - Dubai Visa)
    
    // Let's debug the Urgent ad group first
    await agent.debugAdGroup(customerId, '169122249779');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main(); 