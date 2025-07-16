const GoogleAdsAgent = require('./index.js');
const express = require('express');

async function main() {
  console.log('🚀 Starting Google Ads Monitoring Job...');
  console.log('📋 Environment Check:');
  
  // Check all required environment variables
  const requiredEnvVars = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET', 
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'OPENAI_API_KEY'
  ];
  
  const missingVars = [];
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: MISSING`);
    } else {
      console.log(`✅ ${varName}: SET (${value.substring(0, 8)}...)`);
    }
  });
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please ensure all environment variables are set in Cloud Run');
    process.exit(1);
  }
  
  console.log('✅ All environment variables are present');
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`🌍 Platform: ${process.platform}`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  
  const dryRun = false; // Set to false for real actions
  const agent = new GoogleAdsAgent(dryRun);

  try {
    console.log('🔧 Initializing Google Ads Agent...');
    await agent.initialize();
    console.log('✅ Agent initialized successfully');
    
    const customerId = '2080307721'; // Your sub account
    console.log(`🎯 Running monitoring cycle for customer: ${customerId}`);
    
    // Only run a single monitoring cycle and exit
    await agent.runMonitoringCycle(customerId);
    console.log('✅ Job completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    });
    throw error;
  }
}

// Create Express server for Cloud Run
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Google Ads Monitoring Agent is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  
  // Run the monitoring cycle when the server starts
  main().then(result => {
    console.log('✅ Monitoring cycle completed successfully');
  }).catch(error => {
    console.error('❌ Error in main:', error);
    process.exit(1);
  });
});

// Add unhandled error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  process.exit(1);
}); 