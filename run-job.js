const GoogleAdsAgent = require('./index.js');

async function main() {
  const dryRun = false; // Set to false for real actions
  const agent = new GoogleAdsAgent(dryRun);

  try {
    await agent.initialize();
    const customerId = '2080307721'; // Replace with your actual customer ID
    await agent.runMonitoringCycle(customerId);
    console.log('✅ Job completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main(); 