const { GoogleAdsApi } = require('google-ads-api');
const express = require('express');
require('dotenv').config();

class CloudGoogleAdsMonitor {
  constructor() {
    this.client = null;
    this.customer = null;
  }

  async initialize() {
    console.log('🔧 Initializing cloud monitoring...');
    
    // Load credentials from environment variables (for cloud deployment)
    const credentials = {
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    };
    
    // Validate credentials
    const missingCreds = [];
    Object.entries(credentials).forEach(([key, value]) => {
      if (!value) {
        missingCreds.push(key);
      }
    });

    if (missingCreds.length > 0) {
      throw new Error(`Missing credentials: ${missingCreds.join(', ')}`);
    }
    
    this.client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });
    
    this.customer = this.client.Customer({
      customer_id: '2080307721',
      refresh_token: credentials.refresh_token,
      login_customer_id: '2558852824',
    });
    
    console.log('✅ Cloud monitoring initialized successfully');
  }

  async getEnabledDisapprovedAds() {
    console.log('🔍 Finding enabled disapproved ads...');
    
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
        ad_group_ad.status
      FROM ad_group_ad 
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      AND ad_group.status IN ('ENABLED', 'PAUSED')
      AND ad_group_ad.status = 'ENABLED'
      AND ad_group_ad.policy_summary.approval_status = 'DISAPPROVED'
      LIMIT 50
    `;
    
    const response = await this.customer.query(query);
    console.log(`🔍 Query returned ${response.length} results`);
    const ads = response.map(row => {
      return {
        ad_group_ad: {
          ad: { id: row.ad_group_ad.ad.id },
          policy_summary: { approval_status: row.ad_group_ad.policy_summary.approval_status },
          resource_name: row.ad_group_ad.resource_name,
          status: row.ad_group_ad.status
        },
        ad_group: { id: row.ad_group.id, name: row.ad_group.name },
        campaign: { id: row.campaign.id, name: row.campaign.name }
      };
    });
    
    console.log(`📊 Found ${ads.length} enabled disapproved ads`);
    return ads;
  }

  async pauseAd(adResourceName) {
    console.log(`⏸️ Pausing ad: ${adResourceName}`);
    
    try {
      const result = await this.customer.adGroupAds.update(
        [{
          resource_name: adResourceName,
          status: 3, // PAUSED
        }],
        {
          updateMask: 'status'
        }
      );
      
      console.log(`✅ Successfully paused ad`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to pause ad:`, error.message || error);
      console.error(`❌ Error details:`, error);
      throw error;
    }
  }

  async createAdDuplicate(ad) {
    console.log(`🔄 Creating duplicate for ad ${ad.ad_group_ad.ad.id}...`);
    
    // Get ad details
    const adDetailsQuery = `
      SELECT 
        ad_group_ad.ad.type,
        ad_group_ad.ad.expanded_text_ad.headline_part1,
        ad_group_ad.ad.expanded_text_ad.headline_part2,
        ad_group_ad.ad.expanded_text_ad.headline_part3,
        ad_group_ad.ad.expanded_text_ad.description,
        ad_group_ad.ad.expanded_text_ad.description2,
        ad_group_ad.ad.expanded_text_ad.path1,
        ad_group_ad.ad.expanded_text_ad.path2,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2
      FROM ad_group_ad 
      WHERE ad_group_ad.ad.id = ${ad.ad_group_ad.ad.id}
    `;
    
    const adDetailsResponse = await this.customer.query(adDetailsQuery);
    const adDetails = adDetailsResponse[0];
    
    // Build duplicate payload based on ad type
    let duplicatePayload = {
      ad_group: `customers/2080307721/adGroups/${ad.ad_group.id}`,
      status: 'ENABLED'
    };
    
    if (adDetails.ad_group_ad.ad.type === 3) { // EXPANDED_TEXT_AD
      duplicatePayload.ad = {
        expanded_text_ad: {
          headline_part1: adDetails.ad_group_ad.ad.expanded_text_ad.headline_part1,
          headline_part2: adDetails.ad_group_ad.ad.expanded_text_ad.headline_part2,
          headline_part3: adDetails.ad_group_ad.ad.expanded_text_ad.headline_part3,
          description: adDetails.ad_group_ad.ad.expanded_text_ad.description,
          description2: adDetails.ad_group_ad.ad.expanded_text_ad.description2,
          path1: adDetails.ad_group_ad.ad.expanded_text_ad.path1,
          path2: adDetails.ad_group_ad.ad.expanded_text_ad.path2
        }
      };
    } else if (adDetails.ad_group_ad.ad.type === 15) { // RESPONSIVE_SEARCH_AD
      // For responsive search ads, we need at least 3 headlines and 2 descriptions
      const headlines = adDetails.ad_group_ad.ad.responsive_search_ad.headlines
        .filter(h => h.text && h.text.trim().length >= 5) // Minimum 5 characters
        .map(h => ({ text: h.text }));
      
      const descriptions = adDetails.ad_group_ad.ad.responsive_search_ad.descriptions
        .filter(d => d.text && d.text.trim().length >= 10) // Minimum 10 characters
        .map(d => ({ text: d.text }));
      
      if (headlines.length >= 3 && descriptions.length >= 2) {
        duplicatePayload.ad = {
          responsive_search_ad: {
            headlines: headlines,
            descriptions: descriptions
          },
          final_urls: ['https://visago.ae'] // Add a default final URL
        };
      } else {
        throw new Error(`Insufficient content: ${headlines.length} headlines (need 3+) and ${descriptions.length} descriptions (need 2+)`);
      }
    }
    
    try {
      const result = await this.customer.adGroupAds.create([duplicatePayload]);
      console.log(`✅ Successfully created duplicate ad`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to create duplicate:`, error.message || error);
      console.error(`❌ Error details:`, error);
      throw error;
    }
  }

  async processAds() {
    console.log('🚀 Starting cloud monitoring process...\n');
    
    try {
      // Step 1: Get enabled disapproved ads
      const disapprovedAds = await this.getEnabledDisapprovedAds();
      
      if (disapprovedAds.length === 0) {
        console.log('✅ No enabled disapproved ads found');
        return { processed: 0, success: 0, errors: 0 };
      }
      
      console.log(`📋 Processing ${disapprovedAds.length} enabled disapproved ads:\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Step 2: Process each ad
      for (const ad of disapprovedAds) {
        console.log(`🔧 Processing ad ${ad.ad_group_ad.ad.id} in ${ad.ad_group.name}:`);
        
        try {
          // Step 2a: Pause the disapproved ad
          console.log(`  ⏸️ Pausing ad...`);
          await this.pauseAd(ad.ad_group_ad.resource_name);
          
          // Step 2b: Create duplicate (we always want to duplicate after pausing)
          console.log(`  🔄 Creating duplicate...`);
          await this.createAdDuplicate(ad);
          console.log(`  ✅ Successfully processed ad ${ad.ad_group_ad.ad.id}\n`);
          successCount++;
          
        } catch (error) {
          console.error(`  ❌ Failed to process ad ${ad.ad_group_ad.ad.id}:`, error.message);
          console.log('');
          errorCount++;
        }
      }
      
      console.log('🎉 Cloud monitoring process completed!');
      console.log(`📊 Results: ${successCount} successful, ${errorCount} errors`);
      
      return { processed: disapprovedAds.length, success: successCount, errors: errorCount };
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      throw error;
    }
  }
}

// Express server setup
const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Google Ads Monitoring Agent',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Google Ads Monitoring Agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      '/': 'Health check',
      '/health': 'Detailed health status',
      '/run-monitoring': 'Trigger monitoring cycle'
    }
  });
});

// Monitoring trigger endpoint (for Cloud Scheduler)
app.get('/run-monitoring', async (req, res) => {
  console.log('🔄 Cloud Scheduler triggered monitoring cycle');
  
  try {
    const monitor = new CloudGoogleAdsMonitor();
    await monitor.initialize();
    const results = await monitor.processAds();
    
    res.json({
      success: true,
      message: 'Monitoring cycle completed',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Monitoring cycle failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Cloud monitoring server listening on port ${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET / - Health check`);
  console.log(`   - GET /health - Detailed health status`);
  console.log(`   - GET /run-monitoring - Trigger monitoring cycle (for Cloud Scheduler)`);
  console.log(`⏰ Monitoring cycle will be triggered by Cloud Scheduler`);
});

module.exports = { CloudGoogleAdsMonitor }; 