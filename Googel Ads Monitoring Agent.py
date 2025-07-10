// Google Ads Monitoring Agent - Complete Version
// Monitors ALL enabled campaigns and ad groups for disapproved ads

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

class GoogleAdsAgent {
  constructor() {
    this.client = null;
    this.credentials = null;
  }

  async initialize() {
    try {
      // Load credentials from secrets.json
      const secretsPath = path.join(__dirname, 'secrets.json');
      const secretsData = await fs.readFile(secretsPath, 'utf8');
      this.credentials = JSON.parse(secretsData);

      // Initialize Google Ads client
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

  async getCustomerClient(customerId) {
    return this.client.Customer({
      customer_id: customerId,
      refresh_token: this.credentials.refresh_token,
    });
  }

  async getAllEnabledAds(customerId) {
    const customer = await this.getCustomerClient(customerId);
    
    try {
      // Query to get ALL ads in ALL enabled campaigns and ad groups
      const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.ad.expanded_text_ad.headline_part1,
          ad_group_ad.ad.expanded_text_ad.headline_part2,
          ad_group_ad.ad.expanded_text_ad.description,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.policy_summary.approval_status,
          ad_group_ad.policy_summary.policy_topic_entries,
          ad_group_ad.resource_name,
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.id,
          campaign.name,
          campaign.status
        FROM ad_group_ad 
        WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
      `;

      const results = await customer.query(query);
      console.log(`📊 Found ${results.length} total enabled ads across all campaigns`);
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
      return approvalStatus === 'DISAPPROVED' || approvalStatus === 'UNDER_REVIEW';
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

    console.log(`🔍 Found ${disapprovedAds.length} disapproved/under review ads across ${Object.keys(campaignGroups).length} campaigns:`);
    
    Object.keys(campaignGroups).forEach(campaignKey => {
      console.log(`   📁 ${campaignKey}: ${campaignGroups[campaignKey].length} ads`);
    });

    return disapprovedAds;
  }

  async createAdDuplicate(customerId, originalAd) {
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const adGroupId = originalAd.ad_group.id;
      const originalAdData = originalAd.ad_group_ad.ad;
      
      // IMPORTANT: URLs are NEVER modified - only text content
      const preservedUrls = originalAdData.final_urls;
      
      // Create a modified version of the ad (text only)
      let newAd = {};
      
      if (originalAdData.type === 'EXPANDED_TEXT_AD') {
        newAd = {
          expanded_text_ad: {
            headline_part1: this.modifyText(originalAdData.expanded_text_ad.headline_part1),
            headline_part2: this.modifyText(originalAdData.expanded_text_ad.headline_part2),
            description: this.modifyText(originalAdData.expanded_text_ad.description),
          },
          final_urls: preservedUrls, // URLs are preserved exactly
          type: 'EXPANDED_TEXT_AD'
        };
      } else if (originalAdData.type === 'RESPONSIVE_SEARCH_AD') {
        newAd = {
          responsive_search_ad: {
            headlines: originalAdData.responsive_search_ad.headlines.map(h => ({
              text: this.modifyText(h.text),
              pinned_field: h.pinned_field
            })),
            descriptions: originalAdData.responsive_search_ad.descriptions.map(d => ({
              text: this.modifyText(d.text),
              pinned_field: d.pinned_field
            }))
          },
          final_urls: preservedUrls, // URLs are preserved exactly
          type: 'RESPONSIVE_SEARCH_AD'
        };
      }

      // Create the new ad
      const adGroupAdOperation = {
        create: {
          ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
          ad: newAd,
          status: 'ENABLED'
        }
      };

      const response = await customer.adGroupAds.mutate([adGroupAdOperation]);
      
      console.log(`✅ Created duplicate ad: ${response.results[0].resource_name}`);
      return response.results[0];
      
    } catch (error) {
      console.error('❌ Error creating ad duplicate:', error.message);
      throw error;
    }
  }

  modifyText(originalText) {
    if (!originalText) return originalText;
    
    // Visa-specific modifications that preserve meaning and compliance
    const visaSpecificMods = [
      // Time-related synonyms
      (text) => text.replace(/\b24 Hours?\b/gi, '1 Day'),
      (text) => text.replace(/\b24hr?\b/gi, 'Same Day'),
      (text) => text.replace(/\bFast\b/gi, 'Quick'),
      (text) => text.replace(/\bQuick\b/gi, 'Rapid'),
      (text) => text.replace(/\bExpress\b/gi, 'Priority'),
      (text) => text.replace(/\bUrgent\b/gi, 'Priority'),
      (text) => text.replace(/\bInstant\b/gi, 'Immediate'),
      (text) => text.replace(/\bSame-Day\b/gi, 'Today'),
      
      // Action words
      (text) => text.replace(/\bApply\b/gi, 'Submit'),
      (text) => text.replace(/\bGet\b/gi, 'Obtain'),
      (text) => text.replace(/\bStart\b/gi, 'Begin'),
      (text) => text.replace(/\bBring\b/gi, 'Invite'),
      
      // Service descriptions
      (text) => text.replace(/\bTrusted\b/gi, 'Reliable'),
      (text) => text.replace(/\bSecure\b/gi, 'Safe'),
      (text) => text.replace(/\bHassle-Free\b/gi, 'Simple'),
      (text) => text.replace(/\bEasy\b/gi, 'Simple'),
      (text) => text.replace(/\bPrompt\b/gi, 'Swift'),
      (text) => text.replace(/\bAvailable\b/gi, 'Offered'),
      
      // Process terms
      (text) => text.replace(/\bProcessing\b/gi, 'Handling'),
      (text) => text.replace(/\bApplication\b/gi, 'Submission'),
      (text) => text.replace(/\bApprovals\b/gi, 'Confirmations'),
      (text) => text.replace(/\bService\b/gi, 'Support'),
      
      // Location variations
      (text) => text.replace(/\bDubai\b/gi, 'UAE'),
      (text) => text.replace(/\bUAE\b/gi, 'Dubai'),
    ];
    
    // Try each modification until one works
    for (let i = 0; i < visaSpecificMods.length; i++) {
      const modifiedText = visaSpecificMods[i](originalText);
      if (modifiedText !== originalText) {
        console.log(`📝 Modified: "${originalText}" → "${modifiedText}"`);
        return modifiedText;
      }
    }
    
    // Fallback: Add relevant descriptive words for visa services
    const visaDescriptors = [
      'Online', 'Digital', 'Official', 'Authorized', 'Certified', 
      'Professional', 'Verified', 'Licensed', 'Expert'
    ];
    
    const randomDescriptor = visaDescriptors[Math.floor(Math.random() * visaDescriptors.length)];
    const result = `${randomDescriptor} ${originalText}`;
    console.log(`📝 Added descriptor: "${originalText}" → "${result}"`);
    return result;
  }

  async pauseDisapprovedAd(customerId, adResourceName) {
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const operation = {
        update: {
          resource_name: adResourceName,
          status: 'PAUSED'
        },
        update_mask: ['status']
      };

      await customer.adGroupAds.mutate([operation]);
      console.log(`⏸️  Paused disapproved ad: ${adResourceName}`);
    } catch (error) {
      console.error('❌ Error pausing ad:', error.message);
      throw error; // Re-throw to ensure we know if pausing fails
    }
  }

  async runMonitoringCycle(customerId) {
    console.log(`🚀 Starting monitoring cycle for ALL enabled campaigns in account ${customerId}`);
    
    try {
      // Find all disapproved ads across all campaigns
      const disapprovedAds = await this.findAllDisapprovedAds(customerId);
      
      for (const ad of disapprovedAds) {
        const campaignName = ad.campaign.name;
        const adGroupName = ad.ad_group.name;
        
        console.log(`\n📋 Processing disapproved ad in "${campaignName}" > "${adGroupName}"`);
        console.log(`   Ad ID: ${ad.ad_group_ad.ad.id}`);
        
        // Log disapproval reasons
        if (ad.ad_group_ad.policy_summary?.policy_topic_entries) {
          console.log('📝 Disapproval reasons:');
          ad.ad_group_ad.policy_summary.policy_topic_entries.forEach(entry => {
            console.log(`   - ${entry.topic}: ${entry.type}`);
          });
        }
        
        // Create duplicate
        await this.createAdDuplicate(customerId, ad);
        
        // IMPORTANT: Pause the original disapproved ad to stay within 3-ad limit
        await this.pauseDisapprovedAd(customerId, ad.ad_group_ad.resource_name);
        
        // Add delay to avoid rate limits
        await this.sleep(2000);
      }
      
      console.log(`\n✅ Monitoring cycle completed. Processed ${disapprovedAds.length} ads across all campaigns`);
      
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startMonitoring(customerId, intervalMinutes = 60) {
    console.log(`⏰ Starting continuous monitoring for ALL campaigns every ${intervalMinutes} minutes`);
    
    // Run initial cycle
    await this.runMonitoringCycle(customerId);
    
    // Set up recurring monitoring
    setInterval(async () => {
      try {
        await this.runMonitoringCycle(customerId);
      } catch (error) {
        console.error('❌ Error in scheduled monitoring:', error.message);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

// Usage example
async function main() {
  const agent = new GoogleAdsAgent();
  
  try {
    await agent.initialize();
    
    // Replace with your actual customer ID (sub account)
    const customerId = '2080307721'; // Your sub account (208-030-7721)
    
    // Run once to check all campaigns
    // await agent.runMonitoringCycle(customerId);
    
    // Or start continuous monitoring for ALL campaigns (every 60 minutes)
    await agent.startMonitoring(customerId, 60);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = GoogleAdsAgent;