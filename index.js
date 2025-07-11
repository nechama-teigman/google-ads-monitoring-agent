// Google Ads Monitoring Agent - Final Version
// Monitors ALL enabled campaigns and ad groups for disapproved ads

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class GoogleAdsAgent {
  constructor(dryRun = true) {
    this.client = null;
    this.credentials = null;
    this.dryRun = dryRun;
  }

  async initialize() {
    try {
      // Load credentials from environment variables (for cloud deployment)
      this.credentials = {
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      };

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
      login_customer_id: '2558852824', // Your MCC account
    });
  }

  async getAllEnabledAds(customerId) {
    const customer = await this.getCustomerClient(customerId);
    
    try {
      // Modified query to include PAUSED campaigns (since your campaigns are paused)
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
          campaign.status
        FROM ad_group_ad 
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND ad_group.status IN ('ENABLED', 'PAUSED')
        AND ad_group_ad.status = 'ENABLED'
        LIMIT 100
      `;

      console.log('🔍 Executing query (including paused campaigns)...');
      const results = await customer.query(query);
      console.log(`📊 Found ${results.length} enabled ads in enabled/paused campaigns`);
      console.log(`🔎 Looking for ads with DISAPPROVED or UNDER_REVIEW status...`);
      return results;
    } catch (error) {
      console.error('❌ Error querying ads:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  async findAllDisapprovedAds(customerId) {
    const allAds = await this.getAllEnabledAds(customerId);
    
    const disapprovedAds = allAds.filter(ad => {
      const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
      // Google Ads approval status codes:
      // 1 = APPROVED
      // 2 = APPROVED_LIMITED (limited by policy)  
      // 3 = DISAPPROVED
      // 4 = UNDER_REVIEW
      return approvalStatus === 2 || approvalStatus === 3 || approvalStatus === 4;
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
      if (campaignKey.toLowerCase().includes('amg')) {
        filteredCampaignGroups[campaignKey] = campaignGroups[campaignKey];
      }
    });
    const filteredDisapprovedAds = Object.values(filteredCampaignGroups).flat();

    console.log(`🔍 Found ${filteredDisapprovedAds.length} ads with policy issues across ${Object.keys(filteredCampaignGroups).length} AMG campaigns:`);
    Object.keys(filteredCampaignGroups).forEach(campaignKey => {
      console.log(`   📁 ${campaignKey}: ${filteredCampaignGroups[campaignKey].length} ads`);
    });

    // Show approval status breakdown
    const statusCounts = { 2: 0, 3: 0, 4: 0 };
    filteredDisapprovedAds.forEach(ad => {
      const status = ad.ad_group_ad?.policy_summary?.approval_status;
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    
    console.log(`📊 Status breakdown:`);
    if (statusCounts[2] > 0) console.log(`   - ${statusCounts[2]} ads with limited approval (status 2)`);
    if (statusCounts[3] > 0) console.log(`   - ${statusCounts[3]} ads disapproved (status 3)`);
    if (statusCounts[4] > 0) console.log(`   - ${statusCounts[4]} ads under review (status 4)`);

    return filteredDisapprovedAds;
  }

  async getAdDetails(customerId, adGroupAdResourceName) {
    const customer = await this.getCustomerClient(customerId);
    
    try {
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
          ad_group_ad.policy_summary.policy_topic_entries,
          ad_group.id
        FROM ad_group_ad 
        WHERE ad_group_ad.resource_name = '${adGroupAdResourceName}'
      `;

      const results = await customer.query(query);
      return results[0];
    } catch (error) {
      console.error('❌ Error getting ad details:', error.message);
      throw error;
    }
  }

  async createAdDuplicate(customerId, originalAd) {
    // Get full ad details first
    const adDetails = await this.getAdDetails(customerId, originalAd.ad_group_ad.resource_name);
    if (this.dryRun) {
      console.log(`[DRY RUN] adDetails for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(adDetails, { depth: null });
    }
    const adGroupId = originalAd.ad_group.id;
    const originalAdData = adDetails.ad_group_ad.ad;
    if (this.dryRun) {
      console.log(`[DRY RUN] originalAdData for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(originalAdData, { depth: null });
    }
    const preservedUrls = originalAdData.final_urls;
    let newAd = {};
    if (originalAdData.type === 'EXPANDED_TEXT_AD' || originalAdData.type === 3) {
      newAd = {
        expanded_text_ad: {
          headline_part1: originalAdData.expanded_text_ad.headline_part1,
          headline_part2: originalAdData.expanded_text_ad.headline_part2,
          description: originalAdData.expanded_text_ad.description,
        },
        final_urls: preservedUrls
      };
    } else if (originalAdData.type === 'RESPONSIVE_SEARCH_AD' || originalAdData.type === 15) {
      newAd = {
        responsive_search_ad: {
          headlines: originalAdData.responsive_search_ad.headlines.map(h => {
            const obj = { text: h.text };
            if (h.pinned_field !== undefined && h.pinned_field !== null) obj.pinned_field = h.pinned_field;
            return obj;
          }),
          descriptions: originalAdData.responsive_search_ad.descriptions.map(d => {
            const obj = { text: d.text };
            if (d.pinned_field !== undefined && d.pinned_field !== null) obj.pinned_field = d.pinned_field;
            return obj;
          })
        },
        final_urls: preservedUrls
      };
    } else {
      if (this.dryRun) {
        console.warn(`[DRY RUN] Unhandled ad type: ${originalAdData.type}`);
      }
    }
    if (this.dryRun) {
      console.log(`[DRY RUN] newAd for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(newAd, { depth: null });
    }
    const newAdGroupAd = {
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      ad: newAd,
      status: 'ENABLED'
    };
    if (this.dryRun) {
      console.log(`[DRY RUN] Would create duplicate ad with payload:`);
      console.dir(newAdGroupAd, { depth: null });
      return { resource_name: '[DRY RUN] Not created' };
    }
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const response = await customer.adGroupAds.create([newAdGroupAd]);
      
      console.log(`✅ Created duplicate ad: ${response.results[0].resource_name}`);
      return response.results[0];
      
    } catch (error) {
      console.error('❌ Error creating ad duplicate:', error);
      throw error;
    }
  }

  async rewriteWithOpenAI(text, maxLength, context = 'ad headline') {
    try {
      const prompt = `Rewrite the following ${context} to be under ${maxLength} characters, keep it natural, relevant, and readable:\n"${text}"`;
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.7,
      });
      const rewritten = response.choices[0].message.content.trim().replace(/^\["']|["']$/g, '');
      return rewritten.length > maxLength ? rewritten.slice(0, maxLength) : rewritten;
    } catch (err) {
      console.warn('OpenAI rewrite failed, falling back to truncation:', err.message);
      return text.length > maxLength ? text.slice(0, maxLength) : text;
    }
  }

  async modifyText(originalText, maxLength = 30, context = 'ad headline') {
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
        originalText = modifiedText;
        break;
      }
    }
    
    // Fallback: Add relevant descriptive words for visa services
    const visaDescriptors = [
      'Online', 'Digital', 'Official', 'Authorized', 'Certified', 
      'Professional', 'Verified', 'Licensed', 'Expert'
    ];
    if (originalText.length > maxLength) {
      return await this.rewriteWithOpenAI(originalText, maxLength, context);
    }
    const randomDescriptor = visaDescriptors[Math.floor(Math.random() * visaDescriptors.length)];
    let result = `${randomDescriptor} ${originalText}`;
    if (result.length > maxLength) {
      result = await this.rewriteWithOpenAI(result, maxLength, context);
    }
    return result;
  }

  async pauseDisapprovedAd(customerId, adResourceName) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would pause ad: ${adResourceName}`);
      return;
    }
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const updateData = {
        resource_name: adResourceName,
        status: 'PAUSED'
      };

      await customer.adGroupAds.update([updateData]);
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
        
        // Create duplicate
        await this.createAdDuplicate(customerId, ad);
        
        // IMPORTANT: Pause the original disapproved ad to stay within 3-ad limit
        await this.pauseDisapprovedAd(customerId, ad.ad_group_ad.resource_name);
        
        // Add delay to avoid rate limits
        await this.sleep(2000);
      }
      
      console.log(`\n✅ Monitoring cycle completed. Processed ${disapprovedAds.length} ads across all campaigns`);
      
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
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
  // Force dry run mode for debugging
  const dryRun = false;
  const agent = new GoogleAdsAgent(dryRun);
  
  try {
    await agent.initialize();
    
    // Replace with your actual customer ID (sub account)
    const customerId = '2080307721'; // Your sub account (208-030-7721)
    
    // Run once to check all campaigns
    // await agent.runMonitoringCycle(customerId);
    
    // Or start continuous monitoring for ALL campaigns (every 60 minutes)
    await agent.startMonitoring(customerId, 60);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = GoogleAdsAgent;