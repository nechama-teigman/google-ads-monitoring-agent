// Test script to verify the fixed monitoring logic
const { GoogleAdsApi } = require('google-ads-api');
const path = require('path');
require('dotenv').config();

class GoogleAdsAgent {
  constructor(dryRun = true) {
    this.client = null;
    this.credentials = null;
    this.dryRun = dryRun;
    this.lastApiCall = 0;
    this.minApiInterval = 2000;
  }

  async initialize() {
    try {
      console.log('🔧 Loading credentials from secrets.json...');
      
      const fs = require('fs').promises;
      const secretsPath = path.join(__dirname, 'secrets.json');
      const secretsData = await fs.readFile(secretsPath, 'utf8');
      const credentials = JSON.parse(secretsData);
      
      this.credentials = {
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        developer_token: credentials.developer_token,
        refresh_token: credentials.refresh_token,
      };

      const missingCreds = [];
      Object.entries(this.credentials).forEach(([key, value]) => {
        if (!value || value.includes('YOUR_')) {
          missingCreds.push(key);
        }
      });

      if (missingCreds.length > 0) {
        throw new Error(`Missing credentials: ${missingCreds.join(', ')}`);
      }

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

  async getAllEnabledAds(customerId) {
    console.log('🔧 getAllEnabledAds STARTED for customer:', customerId);
    await this.rateLimit();
    
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.policy_summary.approval_status,
          ad_group_ad.resource_name,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          campaign.status,
          ad_group_ad.status
        FROM ad_group_ad 
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND ad_group.status IN ('ENABLED', 'PAUSED')
        AND ad_group_ad.status IN ('ENABLED', 'PAUSED')
        LIMIT 100
      `;

      console.log('🔍 Executing query...');
      const results = await customer.query(query);
      console.log(`📊 Found ${results.length} ads in enabled/paused campaigns`);
      
      // Debug: Show approval status breakdown for all ads
      const statusBreakdown = {};
      results.forEach(ad => {
        const status = ad.ad_group_ad?.policy_summary?.approval_status;
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      
      console.log(`🔍 Approval status breakdown for all ads:`);
      Object.keys(statusBreakdown).forEach(status => {
        const statusText = status == 1 ? 'APPROVED' : 
                          status == 2 ? 'APPROVED_LIMITED' :
                          status == 3 ? 'DISAPPROVED' :
                          status == 4 ? 'UNDER_REVIEW' : 'UNKNOWN';
        console.log(`   Status ${status} (${statusText}): ${statusBreakdown[status]} ads`);
      });
      
      return results;
    } catch (error) {
      console.error('❌ Error querying ads:', error.message);
      throw error;
    }
  }

  async findAllDisapprovedAds(customerId) {
    const allAds = await this.getAllEnabledAds(customerId);
    
    const disapprovedAds = allAds.filter(ad => {
      const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
      // Google Ads approval status codes:
      // 1 = APPROVED
      // 2 = APPROVED_LIMITED (limited by policy) - these also need attention
      // 3 = DISAPPROVED
      // 4 = UNDER_REVIEW
      const needsAttention = approvalStatus === 2 || approvalStatus === 3; // Both APPROVED_LIMITED and DISAPPROVED
      
      if (needsAttention) {
        const statusText = approvalStatus === 2 ? 'APPROVED_LIMITED' : 
                          approvalStatus === 3 ? 'DISAPPROVED' : 'UNKNOWN';
        console.log(`🔍 Found ad needing attention: Ad ID ${ad.ad_group_ad.ad.id}, Status ${approvalStatus} (${statusText}), Campaign: ${ad.campaign.name}, Ad Group: ${ad.ad_group.name}`);
      }
      
      return needsAttention;
    });

    // Group by campaign for better reporting
    const campaignGroups = {};
    disapprovedAds.forEach(ad => {
      const campaignName = ad.campaign.name;
      const campaignId = ad.campaign.id;
      const key = `${campaignName} (${campaignId})`;
      
      if (!campaignGroups[key]) {
        campaignGroups[key] = [];
      }
      campaignGroups[key].push(ad);
    });

    // Filter to only campaigns with 'AMG' in the name (case-insensitive)
    const filteredCampaignGroups = {};
    Object.keys(campaignGroups).forEach(campaignKey => {
      if (campaignKey && campaignKey.toLowerCase().includes('amg')) {
        filteredCampaignGroups[campaignKey] = campaignGroups[campaignKey];
      }
    });
    const filteredDisapprovedAds = Object.values(filteredCampaignGroups).flat();

    console.log(`🔍 Found ${filteredDisapprovedAds.length} ads needing attention across ${Object.keys(filteredCampaignGroups).length} AMG campaigns:`);
    console.log(`📊 Total ads queried: ${allAds.length}`);
    console.log(`📊 Ads needing attention found: ${disapprovedAds.length}`);
    console.log(`📊 AMG campaign ads: ${filteredDisapprovedAds.length}`);
    Object.keys(filteredCampaignGroups).forEach(campaignKey => {
      console.log(`   📁 ${campaignKey}: ${filteredCampaignGroups[campaignKey].length} ads`);
    });

    // Show approval status breakdown
    const statusCounts = { 2: 0, 3: 0 };
    filteredDisapprovedAds.forEach(ad => {
      const status = ad.ad_group_ad?.policy_summary?.approval_status;
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    
    console.log(`📊 Status breakdown:`);
    if (statusCounts[2] > 0) console.log(`   - ${statusCounts[2]} ads approved limited (status 2)`);
    if (statusCounts[3] > 0) console.log(`   - ${statusCounts[3]} ads disapproved (status 3)`);

    return filteredDisapprovedAds;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runMonitoringCycle(customerId) {
    console.log(`🚀 Starting monitoring cycle for customer ${customerId}`);
    
    try {
      console.log(`🔍 Step 1: Finding all ads needing attention...`);
      const disapprovedAds = await this.findAllDisapprovedAds(customerId);
      
      console.log(`📊 Found ${disapprovedAds.length} ads needing attention to process`);
      
      if (disapprovedAds.length === 0) {
        console.log('✅ No ads needing attention found - all good!');
        return;
      }
      
      console.log('📋 Ads needing attention found:');
      disapprovedAds.forEach((ad, index) => {
        const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
        const statusText = approvalStatus === 2 ? 'APPROVED_LIMITED' : 
                          approvalStatus === 3 ? 'DISAPPROVED' : 'UNKNOWN';
        console.log(`   ${index + 1}. Ad ID: ${ad.ad_group_ad.ad.id}, Status: ${approvalStatus} (${statusText}), Campaign: ${ad.campaign.name}, Ad Group: ${ad.ad_group.name}`);
      });
      
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
      throw error;
    }
  }
}

async function main() {
  const dryRun = true; // Set to true for testing
  const agent = new GoogleAdsAgent(dryRun);
  
  try {
    await agent.initialize();
    
    const customerId = '2080307721';
    
    await agent.runMonitoringCycle(customerId);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main(); 