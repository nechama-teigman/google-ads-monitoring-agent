// Simple test to verify the Express server can start
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Google Ads Monitoring Agent is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/run-monitoring', async (req, res) => {
  console.log('🔄 Cloud Scheduler triggered monitoring cycle');
  
  // For testing, just return success without running the actual monitoring
  res.json({ 
    status: 'success', 
    message: 'Monitoring endpoint is working (test mode)',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Test server listening on port ${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET / - Health check`);
  console.log(`   - GET /health - Detailed health status`);
  console.log(`   - GET /run-monitoring - Trigger monitoring cycle (test mode)`);
});

console.log('✅ Test server started successfully'); 