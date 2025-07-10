// Google Ads Cloud Monitoring Agent
// Optimized for cloud deployment with health checks

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple HTTP server for health checks
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Cloud agent health check available on port ${process.env.PORT || 3000}`);
});

// Enhanced logging with timestamps
class Logger {
  constructor() {
    this.logFile = path.join(__dirname, 'cloud-logs.txt');
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    // Console output
    console.log(logEntry.trim());
    
    // File output
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async logError(error, context = '') {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;
    await this.log(errorMessage, 'ERROR');
    if (error.stack) {
      await this.log(error.stack, 'ERROR');
    }
  }
}

class GoogleAdsCloudAgent {
  constructor(dryRun = false) {
    this.client = null;
    this.credentials = null;
    this.dryRun = dryRun;
    this.logger = new Logger();
    this.isRunning = false;
    this.monitoringInterval = null;
  }

  async initialize() {
    try {
      await this.logger.log('🚀 Starting Google Ads Cloud Agent...');
      
      // Load credentials from environment variables (cloud-friendly)
      this.credentials = {
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
      };

      // Validate required environment variables
      const requiredVars = ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_REFRESH_TOKEN'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      // Initialize Google Ads client
      this.client = new GoogleAdsApi({
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        developer_token: this.credentials.developer_token,
      });

      await this.logger.log('✅ Google Ads Cloud Agent initialized successfully');
      return true;
    } catch (error) {
      await this.logger.logError(error, 'Failed to initialize cloud agent');
      return false;
    }
  }

  async getCustomerClient(customerId) {
    return this.client.Customer({
      customer_id: customerId,
      refresh_token: this.credentials.refresh_token,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID || '2558852824',
    });
  }

  async getAllEnabledAds(customerId) {
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
          campaign.status
        FROM ad_group_ad 
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND ad_group.status IN ('ENABLED', 'PAUSED')
        AND ad_group_ad.status = 'ENABLED'
        LIMIT 100
      `;

      await this.logger.log('🔍 Executing query (including paused campaigns)...');
      const results = await customer.query(query);
      await this.logger.log(`📊 Found ${results.length} enabled ads in enabled/paused campaigns`);
      await this.logger.log(`🔎 Looking for ads with DISAPPROVED or UNDER_REVIEW status...`);
      return results;
    } catch (error) {
      await this.logger.logError(error, 'Error querying ads');
      throw error;
    }
  }

  async findAllDisapprovedAds(customerId) {
    const allAds = await this.getAllEnabledAds(customerId);
    
    const disapprovedAds = allAds.filter(ad => {
      const approvalStatus = ad.ad_group_ad?.policy_summary?.approval_status;
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

    await this.logger.log(`🔍 Found ${filteredDisapprovedAds.length} ads with policy issues across ${Object.keys(filteredCampaignGroups).length} AMG campaigns:`);
    Object.keys(filteredCampaignGroups).forEach(campaignKey => {
      this.logger.log(`   📁 ${campaignKey}: ${filteredCampaignGroups[campaignKey].length} ads`);
    });

    // Show approval status breakdown
    const statusCounts = { 2: 0, 3: 0, 4: 0 };
    filteredDisapprovedAds.forEach(ad => {
      const status = ad.ad_group_ad?.policy_summary?.approval_status;
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    
    await this.logger.log(`📊 Status breakdown:`);
    if (statusCounts[2] > 0) await this.logger.log(`   - ${statusCounts[2]} ads with limited approval (status 2)`);
    if (statusCounts[3] > 0) await this.logger.log(`   - ${statusCounts[3]} ads disapproved (status 3)`);
    if (statusCounts[4] > 0) await this.logger.log(`   - ${statusCounts[4]} ads under review (status 4)`);

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
      await this.logger.logError(error, 'Error getting ad details');
      throw error;
    }
  }

  async createAdDuplicate(customerId, originalAd) {
    const adDetails = await this.getAdDetails(customerId, originalAd.ad_group_ad.resource_name);
    const adGroupId = originalAd.ad_group.id;
    const originalAdData = adDetails.ad_group_ad.ad;
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
      await this.logger.log(`⚠️  Unhandled ad type: ${originalAdData.type}`);
      return null;
    }

    const newAdGroupAd = {
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      ad: newAd,
      status: 'ENABLED'
    };

    if (this.dryRun) {
      await this.logger.log(`[DRY RUN] Would create duplicate ad for ad ID ${originalAd.ad_group_ad.ad.id}`);
      return { resource_name: '[DRY RUN] Not created' };
    }

    const customer = await this.getCustomerClient(customerId);
    
    try {
      const response = await customer.adGroupAds.create([newAdGroupAd]);
      await this.logger.log(`✅ Created duplicate ad: ${response.results[0].resource_name}`);
      return response.results[0];
    } catch (error) {
      await this.logger.logError(error, 'Error creating ad duplicate');
      throw error;
    }
  }

  async pauseDisapprovedAd(customerId, adResourceName) {
    if (this.dryRun) {
      await this.logger.log(`[DRY RUN] Would pause ad: ${adResourceName}`);
      return;
    }

    const customer = await this.getCustomerClient(customerId);
    
    try {
      const updateData = {
        resource_name: adResourceName,
        status: 'PAUSED'
      };

      await customer.adGroupAds.update([updateData]);
      await this.logger.log(`⏸️  Paused disapproved ad: ${adResourceName}`);
    } catch (error) {
      await this.logger.logError(error, 'Error pausing ad');
      throw error;
    }
  }

  async runMonitoringCycle(customerId) {
    await this.logger.log(`🚀 Starting monitoring cycle for ALL enabled campaigns in account ${customerId}`);
    
    try {
      const disapprovedAds = await this.findAllDisapprovedAds(customerId);
      
      for (const ad of disapprovedAds) {
        const campaignName = ad.campaign.name;
        const adGroupName = ad.ad_group.name;
        
        await this.logger.log(`\n📋 Processing disapproved ad in "${campaignName}" > "${adGroupName}"`);
        await this.logger.log(`   Ad ID: ${ad.ad_group_ad.ad.id}`);
        
        // Create duplicate
        await this.createAdDuplicate(customerId, ad);
        
        // Pause the original disapproved ad
        await this.pauseDisapprovedAd(customerId, ad.ad_group_ad.resource_name);
        
        // Add delay to avoid rate limits
        await this.sleep(2000);
      }
      
      await this.logger.log(`\n✅ Monitoring cycle completed. Processed ${disapprovedAds.length} ads across all campaigns`);
      
    } catch (error) {
      await this.logger.logError(error, 'Error in monitoring cycle');
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startMonitoring(customerId, intervalMinutes = 60) {
    await this.logger.log(`⏰ Starting continuous monitoring for ALL campaigns every ${intervalMinutes} minutes`);
    
    this.isRunning = true;
    
    // Run initial cycle
    await this.runMonitoringCycle(customerId);
    
    // Set up recurring monitoring
    this.monitoringInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.logger.log(`🔄 Starting scheduled monitoring cycle...`);
        await this.runMonitoringCycle(customerId);
        await this.logger.log(`⏰ Next monitoring cycle in ${intervalMinutes} minutes`);
      } catch (error) {
        await this.logger.logError(error, 'Error in scheduled monitoring');
      }
    }, intervalMinutes * 60 * 1000);
  }

  async stop() {
    await this.logger.log('🛑 Stopping cloud agent...');
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    await this.logger.log('✅ Cloud agent stopped');
  }

  // Handle graceful shutdown
  setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      await this.logger.log('📴 Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.logger.log('📴 Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      await this.logger.logError(error, 'Uncaught Exception');
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      await this.logger.logError(new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`));
      await this.stop();
      process.exit(1);
    });
  }
}

// Main execution
async function main() {
  const agent = new GoogleAdsCloudAgent(false); // Set to true for dry run
  
  try {
    // Setup graceful shutdown
    agent.setupGracefulShutdown();
    
    // Initialize the agent
    const initialized = await agent.initialize();
    if (!initialized) {
      await agent.logger.log('❌ Failed to initialize cloud agent, exiting...');
      process.exit(1);
    }
    
    // Get customer ID from environment or use default
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || '2080307721';
    
    // Start continuous monitoring
    await agent.startMonitoring(customerId, 60);
    
    await agent.logger.log('🎯 Cloud agent is now running 24/7!');
    
  } catch (error) {
    await agent.logger.logError(error, 'Fatal error in cloud agent');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = GoogleAdsCloudAgent; 