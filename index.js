// Google Ads Monitoring Agent - Final Version
// Monitors ALL enabled campaigns and ad groups for disapproved ads

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const express = require('express');

class GoogleAdsAgent {
  constructor(dryRun = true) {
    this.client = null;
    this.credentials = null;
    this.dryRun = dryRun;
    this.lastApiCall = 0;
    this.minApiInterval = 2000; // 2 seconds between API calls
  }

  async initialize() {
    try {
      console.log('🔧 Checking environment variables...');
      
      // Load credentials from environment variables (for cloud deployment)
      this.credentials = {
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      };

      // Validate credentials
      const missingCreds = [];
      Object.entries(this.credentials).forEach(([key, value]) => {
        if (!value) {
          missingCreds.push(key);
        }
      });

      if (missingCreds.length > 0) {
        throw new Error(`Missing credentials: ${missingCreds.join(', ')}`);
      }

      console.log('✅ All credentials present');
      console.log('🔧 Initializing Google Ads API client...');

      // Initialize Google Ads client
      this.client = new GoogleAdsApi({
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        developer_token: this.credentials.developer_token,
      });

      console.log('✅ Google Ads Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status
      });
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
      login_customer_id: '2558852824', // Your MCC account
    });
  }

  async getAllEnabledAds(customerId) {
          console.log('🔧 getAllEnabledAds STARTED for customer:', customerId, 'VERSION 2');
    await this.rateLimit();
    console.log('🔧 Rate limiting completed');
    
    const customer = await this.getCustomerClient(customerId);
    console.log('🔧 Customer client obtained');
    
    try {
      // Modified query to include PAUSED campaigns and PAUSED ads (since your campaigns are paused)
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

      console.log('🔍 Executing query (including paused campaigns)...');
      console.log('🔍 Query:', query);
      const results = await customer.query(query);
      console.log('🔧 Query executed successfully, results type:', typeof results);
      console.log('🔧 Results length:', results ? results.length : 'undefined');
      console.log(`📊 Found ${results.length} enabled ads in enabled/paused campaigns`);
      
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
      
      console.log(`🔎 Looking for ads with DISAPPROVED status (3)...`);
      return results;
    } catch (error) {
      console.error('❌ Error querying ads:', error.message || 'Unknown error');
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        console.error('⚠️  Quota limit hit, waiting 60 seconds before retry...');
        await this.sleep(60000);
        return this.getAllEnabledAds(customerId); // Retry once
      }
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
      const isDisapproved = approvalStatus === 3; // Only DISAPPROVED ads (approval_status = 3)
      
      // Special debugging for the specific ad we're looking for
      if (ad.ad_group_ad.ad.id === '764582495271') {
        console.log(`🔍 SPECIAL DEBUG - Ad 764582495271: Status ${ad.ad_group_ad.status}, Approval ${approvalStatus}`);
        console.log(`🔍 This ad shows as "Disapproved" in UI but API returns approval_status = ${approvalStatus}`);
      }
      
      if (isDisapproved) {
        console.log(`🔍 Found disapproved ad: Ad ID ${ad.ad_group_ad.ad.id}, Status ${approvalStatus}, Campaign: ${ad.campaign.name}, Ad Group: ${ad.ad_group.name}`);
        
        // Special logging for Dubai visa ad groups
        if (ad.ad_group.name && ad.ad_group.name.toLowerCase().includes('dubai visa')) {
          console.log(`🇦🇪 DUBAI VISA AD GROUP FOUND: Ad ID ${ad.ad_group_ad.ad.id}, Campaign: ${ad.campaign.name}, Ad Group: ${ad.ad_group.name}`);
        }
      }
      
      return isDisapproved;
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

    console.log(`🔍 Found ${filteredDisapprovedAds.length} ads with policy issues across ${Object.keys(filteredCampaignGroups).length} AMG campaigns:`);
    console.log(`📊 Total ads queried: ${allAds.length}`);
    console.log(`📊 Disapproved ads found: ${disapprovedAds.length}`);
    console.log(`📊 AMG campaign ads: ${filteredDisapprovedAds.length}`);
    Object.keys(filteredCampaignGroups).forEach(campaignKey => {
      console.log(`   📁 ${campaignKey}: ${filteredCampaignGroups[campaignKey].length} ads`);
    });

    // Show approval status breakdown
    const statusCounts = { 3: 0 };
    filteredDisapprovedAds.forEach(ad => {
      const status = ad.ad_group_ad?.policy_summary?.approval_status;
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    
    console.log(`📊 Status breakdown:`);
    if (statusCounts[3] > 0) console.log(`   - ${statusCounts[3]} ads disapproved (status 3)`);

    return filteredDisapprovedAds;
  }

  async getAdDetails(customerId, adGroupAdResourceName) {
    await this.rateLimit();
    const customer = await this.getCustomerClient(customerId);
    
    try {
      const query = `
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
        WHERE ad_group_ad.resource_name = '${adGroupAdResourceName}'
      `;

      const results = await customer.query(query);
      const adDetails = results[0];
      
      // Log the retrieved ad details for debugging
      if (adDetails && adDetails.ad_group_ad && adDetails.ad_group_ad.ad) {
        console.log(`🔍 Retrieved ad details for ad ${adDetails.ad_group_ad.ad.id}:`);
        console.log(`   Type: ${adDetails.ad_group_ad.ad.type}`);
        console.log(`   Headlines: ${JSON.stringify(adDetails.ad_group_ad.ad.expanded_text_ad?.headline_part1 || adDetails.ad_group_ad.ad.responsive_search_ad?.headlines)}`);
        console.log(`   Description: ${JSON.stringify(adDetails.ad_group_ad.ad.expanded_text_ad?.description || adDetails.ad_group_ad.ad.responsive_search_ad?.descriptions)}`);
        console.log(`   Final URLs: ${JSON.stringify(adDetails.ad_group_ad.ad.final_urls)}`);
      }
      
      return adDetails;
    } catch (error) {
      console.error('❌ Error getting ad details:', error.message);
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        console.error('⚠️  Quota limit hit, waiting 60 seconds before retry...');
        await this.sleep(60000);
        return this.getAdDetails(customerId, adGroupAdResourceName); // Retry once
      }
      throw error;
    }
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
      
      // Count ALL ads regardless of status (Google Ads counts ALL ads toward the 3-ad limit)
      const allAds = results.filter(ad => {
        return ad.ad_group_ad?.status === 'ENABLED' || ad.ad_group_ad?.status === 'PAUSED';
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
      
      console.log(`✅ Ad group ${adGroupId} has ${allAds.length} TOTAL ads (can accept ${3 - allAds.length} more)`);
      
      // Special logging for ad groups with 3 total ads
      if (allAds.length >= 3) {
        console.log(`🚨 AD GROUP ${adGroupId} HAS ${allAds.length} TOTAL ADS - AT LIMIT!`);
      }
      
      return allAds.length; // Return count of ALL ads (enabled + paused)
    } catch (error) {
      console.error('❌ Error counting ads in ad group:', error.message);
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        console.error('⚠️  Quota limit hit, waiting 60 seconds before retry...');
        await this.sleep(60000);
        return this.countEnabledAdsInAdGroup(customerId, adGroupId); // Retry once
      }
      throw error;
    }
  }

  async createAdDuplicate(customerId, originalAd) {
    console.log(`🔧 CREATE AD DUPLICATE FUNCTION STARTED for ad ${originalAd.ad_group_ad.ad.id}`);
    console.log(`🔧 Step 2a: Getting ad details for ad ${originalAd.ad_group_ad.ad.id}...`);
    // Get full ad details first
    const adDetails = await this.getAdDetails(customerId, originalAd.ad_group_ad.resource_name);
    if (this.dryRun) {
      console.log(`[DRY RUN] adDetails for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(adDetails, { depth: null });
    }
    const adGroupId = originalAd.ad_group.id;
    
    console.log(`🔧 Step 2b: Counting enabled ads in ad group ${adGroupId}...`);
    // Check enabled ad count before creating
    const enabledAdCount = await this.countEnabledAdsInAdGroup(customerId, adGroupId);
    console.log(`📊 Ad group ${adGroupId} currently has ${enabledAdCount} enabled ads`);
    
    if (enabledAdCount >= 3) {
      console.warn(`⚠️  Skipping duplicate: Ad group ${adGroupId} already has ${enabledAdCount} enabled ads (limit is 3).`);
      console.warn(`⚠️  This ad group cannot accept more ads. Consider pausing some existing ads first.`);
      return { resource_name: '[SKIPPED] Ad group at limit' };
    }
    
    console.log(`✅ Ad group ${adGroupId} has ${enabledAdCount} enabled ads - proceeding with duplication`);
    
    console.log(`🔧 Step 2c: Preparing ad data for duplication...`);
    const originalAdData = adDetails.ad_group_ad.ad;
    if (this.dryRun) {
      console.log(`[DRY RUN] originalAdData for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(originalAdData, { depth: null });
    }
    
    // Check if we have valid ad data
    if (!originalAdData) {
      console.error(`❌ No ad data retrieved for ad ${originalAd.ad_group_ad.ad.id}`);
      return { resource_name: '[SKIPPED] No ad data' };
    }
    
    const preservedUrls = originalAdData.final_urls || [];
    
    // Validate that we have the required data
    if (!preservedUrls || preservedUrls.length === 0) {
      console.error(`❌ No final URLs found for ad ${originalAd.ad_group_ad.ad.id}`);
      return { resource_name: '[SKIPPED] No final URLs' };
    }
    let newAd = {};
    if (originalAdData.type === 'EXPANDED_TEXT_AD' || originalAdData.type === 3) {
      console.log(`🔧 Step 2d: Creating expanded text ad...`);
      newAd = {
        expanded_text_ad: {
          headline_part1: originalAdData.expanded_text_ad.headline_part1,
          headline_part2: originalAdData.expanded_text_ad.headline_part2,
          description: originalAdData.expanded_text_ad.description,
        },
        final_urls: preservedUrls
      };
    } else if (originalAdData.type === 'RESPONSIVE_SEARCH_AD' || originalAdData.type === 15) {
      console.log(`🔧 Step 2e: Creating responsive search ad...`);
      newAd = {
        responsive_search_ad: {
          headlines: originalAdData.responsive_search_ad.headlines.map(h => {
            // Only include text and pinned_field, exclude other immutable fields
            const obj = { text: h.text };
            if (h.pinned_field !== undefined && h.pinned_field !== null) obj.pinned_field = h.pinned_field;
            return obj;
          }),
          descriptions: originalAdData.responsive_search_ad.descriptions.map(d => {
            // Only include text and pinned_field, exclude other immutable fields
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
      console.warn(`⚠️  Skipping: Unsupported ad type ${originalAdData.type} for ad ${originalAd.ad_group_ad.ad.id}`);
      return { resource_name: '[SKIPPED] Unsupported ad type' };
    }
    if (this.dryRun) {
      console.log(`[DRY RUN] newAd for ad ID ${originalAd.ad_group_ad.ad.id}:`);
      console.dir(newAd, { depth: null });
    }
    
    // Log ad data for debugging (especially for Dubai visa ad groups)
    if (originalAd.ad_group.name && originalAd.ad_group.name.toLowerCase().includes('dubai visa')) {
      console.log(`🇦🇪 DUBAI VISA AD GROUP - Ad data being sent to API:`);
      console.log(`   Ad Type: ${originalAdData.type}`);
      console.log(`   Headlines: ${JSON.stringify(newAd.expanded_text_ad?.headline_part1 || newAd.responsive_search_ad?.headlines)}`);
      console.log(`   Description: ${JSON.stringify(newAd.expanded_text_ad?.description || newAd.responsive_search_ad?.descriptions)}`);
      console.log(`   Final URLs: ${JSON.stringify(preservedUrls)}`);
    }
    // Clean the ad object to remove any immutable fields
    const cleanAd = JSON.parse(JSON.stringify(newAd));
    
    const newAdGroupAd = {
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      ad: cleanAd,
      status: 'ENABLED'
    };
    if (this.dryRun) {
      console.log(`[DRY RUN] Would create duplicate ad with payload:`);
      console.dir(newAdGroupAd, { depth: null });
      return { resource_name: '[DRY RUN] Not created' };
    }
    
    console.log(`🔧 Step 2f: Creating ad via API...`);
    await this.rateLimit();
    const customer = await this.getCustomerClient(customerId);
    try {
      const response = await customer.adGroupAds.create([newAdGroupAd]);
      console.log(`✅ Created duplicate ad: ${response.results[0].resource_name}`);
      return response.results[0];
    } catch (error) {
      console.error('❌ Error creating ad duplicate:', error.message || error);
      
      // Log detailed error information for Dubai Visa ad groups
      if (originalAd.ad_group.name && originalAd.ad_group.name.toLowerCase().includes('dubai visa')) {
        console.error(`🇦🇪 DUBAI VISA - Detailed error analysis:`);
        console.error(`   Error message: ${error.message || 'No message'}`);
        console.error(`   Error code: ${error.code || 'N/A'}`);
        console.error(`   Error status: ${error.status || 'N/A'}`);
        
        // Log the full error details
        if (error.errors && Array.isArray(error.errors)) {
          console.error(`   API Errors:`);
          error.errors.forEach((err, index) => {
            console.error(`     ${index + 1}. ${err.message || 'No message'} (Code: ${err.code || 'N/A'})`);
            if (err.location) {
              console.error(`        Location: ${err.location}`);
            }
            if (err.details) {
              console.error(`        Details: ${JSON.stringify(err.details)}`);
            }
          });
        }
      }
      
      // Handle specific resource limit errors
      if (error.message && error.message.includes('limit on the number of allowed resources')) {
        console.error('⚠️  Resource limit hit: Ad group cannot accept more ads');
        console.error('⚠️  This usually means the ad group already has 3 ads or other resource limits');
        console.error('⚠️  Skipping this ad and continuing with others...');
        return { resource_name: '[SKIPPED] Resource limit' };
      }
      
      // Handle quota limits specifically
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        console.error('⚠️  Quota limit hit while creating ad, waiting 120 seconds...');
        await this.sleep(120000);
        return this.createAdDuplicate(customerId, originalAd); // Retry once
      }
      
      try {
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      } catch (jsonErr) {
        console.error('❌ Could not stringify error object:', jsonErr);
        console.error('❌ Raw error object:', error);
      }
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
    console.log(`🔧 PAUSE FUNCTION STARTED for ad: ${adResourceName}`);
    console.log(`🔧 Dry run mode: ${this.dryRun}`);
    
    if (this.dryRun) {
      console.log(`[DRY RUN] Would pause ad: ${adResourceName}`);
      return;
    }
    
    console.log(`🔧 About to rate limit...`);
    await this.rateLimit();
    console.log(`🔧 Rate limiting completed for pause`);
    
    console.log(`🔧 Getting customer client...`);
    const customer = await this.getCustomerClient(customerId);
    console.log(`🔧 Customer client obtained for pause`);
    
    try {
      // Try different field names for pausing ads
      // Use the correct format with update_mask for pausing ads
      const updateData = {
        resource_name: adResourceName,
        status: 'PAUSED',
        update_mask: ['status']
      };

      console.log(`🔧 About to call adGroupAds.update with:`, JSON.stringify(updateData, null, 2));
      console.log(`🔧 DEBUG: Trying to pause ad with resource_name: ${adResourceName}`);
      console.log(`🔧 DEBUG: Using status field: 'PAUSED'`);
      console.log(`🔧 Customer object type:`, typeof customer);
      console.log(`🔧 Customer adGroupAds type:`, typeof customer.adGroupAds);
      console.log(`🔧 Customer adGroupAds.update type:`, typeof customer.adGroupAds.update);
      
      const result = await customer.adGroupAds.update([updateData]);
      console.log(`🔧 Update result:`, result);
      console.log('🔍 Update response:', JSON.stringify(result, null, 2));
      
      // Validate the update response
      if (!result || !result.results || result.results.length === 0) {
        console.error('❌ Update failed or returned no result');
        throw new Error('Ad update failed - no result returned');
      }
      
      console.log(`⏸️  Paused disapproved ad: ${adResourceName}`);
      
      // DEBUG: Verify the pause actually worked by checking the ad status
      console.log(`🔍 DEBUG: Verifying pause worked by checking ad status...`);
      await this.sleep(10000); // Wait 10 seconds for pause to take effect
      const verifyQuery = `
        SELECT 
          ad_group_ad.status, 
          ad_group_ad.ad.id, 
          ad_group_ad.resource_name,
          ad_group_ad.policy_summary.approval_status
        FROM ad_group_ad 
        WHERE ad_group_ad.resource_name = '${adResourceName}'
      `;
      // Retry verification up to 3 times with delays
      let adStatus = null;
      let verificationAttempts = 0;
      const maxVerificationAttempts = 3;
      
      while (verificationAttempts < maxVerificationAttempts) {
        verificationAttempts++;
        console.log(`🔍 DEBUG: Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`);
        
        const verifyResult = await customer.query(verifyQuery);
        if (verifyResult.length > 0) {
          adStatus = verifyResult[0].ad_group_ad.status;
          const approvalStatus = verifyResult[0].ad_group_ad.policy_summary?.approval_status;
          console.log(`🔍 DEBUG: Ad status after pause attempt: ${adStatus}`);
          console.log(`🔍 DEBUG: Approval status: ${approvalStatus}`);
          console.log(`🔍 DEBUG: Ad resource name: ${verifyResult[0].ad_group_ad.resource_name}`);
          
          if (adStatus === 'PAUSED') {
            console.log(`✅ DEBUG: Pause verification successful - ad is actually paused`);
            break;
          } else {
            console.log(`❌ DEBUG: Pause verification failed - ad status is still ${adStatus}`);
            if (verificationAttempts < maxVerificationAttempts) {
              console.log(`⏳ DEBUG: Waiting 5 seconds before retry...`);
              await this.sleep(5000);
            } else {
              console.log(`❌ DEBUG: Pause verification failed after ${maxVerificationAttempts} attempts`);
              console.log(`🔍 DEBUG: This suggests the API call didn't work or we're using wrong field`);
            }
          }
        } else {
          console.log(`❌ DEBUG: Could not verify ad status - ad not found`);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error pausing ad:', error.message);
      console.error('❌ Full pause error:', error);
      
      // Handle quota limits specifically
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        console.error('⚠️  Quota limit hit while pausing ad, waiting 120 seconds...');
        await this.sleep(120000);
        return this.pauseDisapprovedAd(customerId, adResourceName); // Retry once
      }
      
      throw error; // Re-throw to ensure we know if pausing fails
    }
  }

  async runMonitoringCycle(customerId) {
    console.log(`🚀 Starting monitoring cycle for ALL enabled campaigns in account ${customerId}`);
    
    try {
      // Find all disapproved ads across all campaigns
      console.log(`🔍 Step 1: Finding all disapproved ads...`);
      const disapprovedAds = await this.findAllDisapprovedAds(customerId);
      
      console.log(`📊 Processing ${disapprovedAds.length} ads (with improved error handling)`);
      
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const ad of disapprovedAds) {
        const campaignName = ad.campaign.name;
        const adGroupName = ad.ad_group.name;
        
        console.log(`\n📋 Processing disapproved ad in "${campaignName}" > "${adGroupName}"`);
        console.log(`   Ad ID: ${ad.ad_group_ad.ad.id}`);
        console.log(`   Ad Group ID: ${ad.ad_group.id}`);
        console.log(`   Ad Resource Name: ${ad.ad_group_ad.resource_name}`);
        console.log(`   Campaign ID: ${ad.campaign.id}`);
        console.log(`   Ad Group Name: ${adGroupName}`);
        
        try {
          console.log(`🔧 Step 2: Pausing original disapproved ad ${ad.ad_group_ad.ad.id} first...`);
          // IMPORTANT: Pause the original disapproved ad FIRST to make room
          try {
            await this.pauseDisapprovedAd(customerId, ad.ad_group_ad.resource_name);
            console.log(`✅ Successfully paused original ad ${ad.ad_group_ad.ad.id}`);
          } catch (pauseError) {
            console.error(`❌ FAILED TO PAUSE AD ${ad.ad_group_ad.ad.id}:`, pauseError);
            console.error(`❌ Pause error message:`, pauseError.message);
            console.error(`❌ Pause error stack:`, pauseError.stack);
            throw pauseError; // Re-throw to stop processing this ad
          }
          
          // Wait a moment for the pause to take effect
          console.log(`⏳ Waiting 5 seconds for pause to take effect...`);
          await this.sleep(5000);
          
          // DEBUG: Check ad count after pausing
          console.log(`🔍 DEBUG: Checking ad count in ad group ${ad.ad_group.id} after pausing...`);
          const adCountAfterPause = await this.countEnabledAdsInAdGroup(customerId, ad.ad_group.id);
          console.log(`🔍 DEBUG: Ad group ${ad.ad_group.id} now has ${adCountAfterPause} enabled ads after pausing`);
          
          console.log(`🔧 Step 3: Creating duplicate for ad ${ad.ad_group_ad.ad.id}...`);
          // Now create duplicate (should have room since we paused the original)
          console.log(`🔧 Step 3a: About to call createAdDuplicate...`);
          try {
            const duplicateResult = await this.createAdDuplicate(customerId, ad);
            console.log(`🔧 Step 3b: createAdDuplicate returned:`, duplicateResult);
          } catch (duplicateError) {
            console.error(`❌ FAILED TO CREATE DUPLICATE FOR AD ${ad.ad_group_ad.ad.id}:`, duplicateError);
            console.error(`❌ Duplicate error message:`, duplicateError.message);
            console.error(`❌ Duplicate error stack:`, duplicateError.stack);
            throw duplicateError; // Re-throw to stop processing this ad
          }
          
          // Check if the duplicate was actually created or skipped
          if (duplicateResult.resource_name && duplicateResult.resource_name.includes('[SKIPPED]')) {
            console.log(`⏭️  Skipped ad ${ad.ad_group_ad.ad.id}: ${duplicateResult.resource_name}`);
            skippedCount++;
            continue;
          }
          
          console.log(`✅ Successfully created duplicate for ad ${ad.ad_group_ad.ad.id}`);
          processedCount++;
          
          // Add longer delay to avoid rate limits
          console.log(`⏳ Waiting 10 seconds before next operation...`);
          await this.sleep(10000);
          
        } catch (error) {
          console.error(`❌ Error processing ad ${ad.ad_group_ad.ad.id}:`, error.message || error);
          console.error(`❌ Campaign: ${ad.campaign.name}, Ad Group: ${ad.ad_group.name}`);
          console.error(`❌ Ad Group ID: ${ad.ad_group.id}, Ad ID: ${ad.ad_group_ad.ad.id}`);
          console.error(`❌ Full error object:`, error);
          
          // Log specific error details for debugging
          if (error.message && error.message.includes('invalid argument')) {
            console.error(`🔍 INVALID ARGUMENT ERROR - This might be a data format issue`);
            console.error(`🔍 Check if ad data is properly formatted for API call`);
          }
          
          errorCount++;
          
          // Continue with next ad instead of stopping
          console.log('⏳ Waiting 10 seconds before next ad...');
          await this.sleep(10000);
        }
      }
      
      console.log(`\n✅ Monitoring cycle completed:`);
      console.log(`   📊 Processed: ${processedCount} ads`);
      console.log(`   ⏭️  Skipped: ${skippedCount} ads (resource limits, unsupported types, etc.)`);
      console.log(`   ❌ Errors: ${errorCount} ads`);
      console.log(`   📈 Total: ${disapprovedAds.length} ads across all campaigns`);
      
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
    await agent.runMonitoringCycle(customerId);
    
    // For Cloud Run, we don't start continuous monitoring
    // The service will be called by Cloud Scheduler instead
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Create Express server for Cloud Run
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Google Ads Monitoring Agent is running');
});

app.get('/health', (req, res) => {
  // Check if we have the required credentials
  const requiredEnvVars = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET', 
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_REFRESH_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  res.json({ 
    status: missingVars.length > 0 ? 'unhealthy' : 'healthy', 
    timestamp: new Date().toISOString(),
    missingCredentials: missingVars.length > 0 ? missingVars : null
  });
});

// Cloud Scheduler endpoint - this is what Cloud Scheduler will call
app.get('/run-monitoring', async (req, res) => {
  console.log('🔄 Cloud Scheduler triggered monitoring cycle');
  
  // Set a timeout for the response
  const timeout = setTimeout(() => {
    console.log('⚠️ Request timeout - sending partial response');
    res.status(200).json({ 
      status: 'timeout', 
      message: 'Request timed out but script is still running',
      timestamp: new Date().toISOString()
    });
  }, 30000); // 30 second timeout
  
  try {
    // Check if we have the required credentials
    const requiredEnvVars = [
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET', 
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_REFRESH_TOKEN'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return res.status(500).json({ 
        status: 'error', 
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const dryRun = false; // Set to false for production
    const agent = new GoogleAdsAgent(dryRun);
    
    await agent.initialize();
    
    // Replace with your actual customer ID (sub account)
    const customerId = '2080307721'; // Your sub account (208-030-7721)
    
    // Run the monitoring cycle
    await agent.runMonitoringCycle(customerId);
    
    clearTimeout(timeout); // Clear the timeout since we're responding
    console.log('✅ Monitoring cycle completed successfully');
    res.json({ 
      status: 'success', 
      message: 'Monitoring cycle completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    clearTimeout(timeout); // Clear the timeout since we're responding
    console.error('❌ Error in monitoring cycle:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error.constructor.name);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status
    });
    
    // Try to get more information about the error
    let errorMessage = 'Unknown error occurred';
    let errorType = 'Unknown';
    
    if (error && typeof error === 'object') {
      errorMessage = error.message || error.toString() || 'Object error without message';
      errorType = error.name || error.constructor.name || 'Unknown';
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'String';
    } else {
      errorMessage = String(error);
      errorType = typeof error;
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: errorMessage,
      errorType: errorType,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET / - Health check`);
  console.log(`   - GET /health - Detailed health status`);
  console.log(`   - GET /run-monitoring - Trigger monitoring cycle (for Cloud Scheduler)`);
  
  // Don't run monitoring cycle on startup - let Cloud Scheduler trigger it
  console.log(`⏰ Monitoring cycle will be triggered by Cloud Scheduler`);
});

// Run if this file is executed directly
if (require.main === module) {
  // This will be handled by the Express server above
}

module.exports = GoogleAdsAgent;