const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs').promises;
const path = require('path');

class GCLIDExporter {
  constructor() {
    this.client = null;
    this.credentials = null;
  }

  async initialize() {
    try {
      // Load credentials from environment variables (for Cloud Run)
      this.credentials = {
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
      };

      // Initialize Google Ads client
      this.client = new GoogleAdsApi({
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        developer_token: this.credentials.developer_token,
      });

      console.log('✅ GCLID Exporter initialized successfully');
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

  async exportGCLIDData(customerId, daysBack = 7) {
    const customer = await this.getCustomerClient(customerId);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📊 Exporting GCLID data from ${startDateStr} to ${endDateStr}`);
    
    try {
      // Query to get GCLID data for the last 7 days
      const query = `
        SELECT 
          customer.id,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          clicks,
          impressions,
          cost_micros,
          conversions,
          gclid,
          date
        FROM customer 
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND gclid IS NOT NULL
        ORDER BY date DESC, clicks DESC
      `;

      console.log('🔍 Executing GCLID query...');
      const results = await customer.query(query);
      
      console.log(`📈 Found ${results.length} records with GCLID data`);
      
      if (results.length === 0) {
        console.log('⚠️ No GCLID data found for the specified date range');
        return [];
      }
      
      // Transform data for export
      const exportData = results.map(record => ({
        date: record.date,
        customer_id: record.customer.id,
        campaign_id: record.campaign.id,
        campaign_name: record.campaign.name,
        ad_group_id: record.ad_group.id,
        ad_group_name: record.ad_group.name,
        ad_id: record.ad_group_ad.ad.id,
        ad_type: record.ad_group_ad.ad.type,
        gclid: record.gclid,
        clicks: record.clicks || 0,
        impressions: record.impressions || 0,
        cost_micros: record.cost_micros || 0,
        cost_usd: (record.cost_micros || 0) / 1000000,
        conversions: record.conversions || 0
      }));
      
      // Create CSV content
      const csvHeaders = [
        'Date',
        'Customer ID',
        'Campaign ID', 
        'Campaign Name',
        'Ad Group ID',
        'Ad Group Name',
        'Ad ID',
        'Ad Type',
        'GCLID',
        'Clicks',
        'Impressions',
        'Cost (USD)',
        'Conversions'
      ];
      
      const csvRows = exportData.map(row => [
        row.date,
        row.customer_id,
        row.campaign_id,
        `"${row.campaign_name}"`,
        row.ad_group_id,
        `"${row.ad_group_name}"`,
        row.ad_id,
        row.ad_type,
        row.gclid,
        row.clicks,
        row.impressions,
        row.cost_usd.toFixed(2),
        row.conversions
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');
      
      // Save to file
      const filename = `gclid_export_${startDateStr}_to_${endDateStr}.csv`;
      await fs.writeFile(filename, csvContent);
      
      console.log(`✅ GCLID data exported to ${filename}`);
      console.log(`📊 Summary:`);
      console.log(`   - Total records: ${exportData.length}`);
      console.log(`   - Date range: ${startDateStr} to ${endDateStr}`);
      console.log(`   - Total clicks: ${exportData.reduce((sum, row) => sum + row.clicks, 0)}`);
      console.log(`   - Total impressions: ${exportData.reduce((sum, row) => sum + row.impressions, 0)}`);
      console.log(`   - Total cost: $${exportData.reduce((sum, row) => sum + row.cost_usd, 0).toFixed(2)}`);
      console.log(`   - Total conversions: ${exportData.reduce((sum, row) => sum + row.conversions, 0)}`);
      
      return exportData;
      
    } catch (error) {
      console.error('❌ Error exporting GCLID data:', error.message);
      throw error;
    }
  }
}

// Usage
async function main() {
  const exporter = new GCLIDExporter();
  
  try {
    await exporter.initialize();
    
    // Replace with your actual customer ID
    const customerId = '2080307721';
    
    // Export last 7 days of GCLID data
    await exporter.exportGCLIDData(customerId, 7);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = GCLIDExporter; 