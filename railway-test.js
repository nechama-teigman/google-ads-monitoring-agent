// Simple Railway deployment test
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Railway deployment test successful!'
    }));
  } else if (req.url === '/files') {
    // List files in the deployment
    try {
      const files = fs.readdirSync('.');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        files: files,
        message: 'Files in deployment directory'
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.url === '/env') {
    // Show environment variables (without sensitive data)
    const envVars = {
      GOOGLE_ADS_CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID ? 'SET' : 'MISSING',
      GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET ? 'SET' : 'MISSING',
      GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'SET' : 'MISSING',
      GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN ? 'SET' : 'MISSING',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
      GOOGLE_ADS_CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID || 'NOT_SET',
      GOOGLE_ADS_MCC_ID: process.env.GOOGLE_ADS_MCC_ID || 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET'
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      environment: envVars,
      message: 'Environment variables status'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Railway Deployment Test</h1>
      <p>✅ Server is running!</p>
      <ul>
        <li><a href="/health">Health Check</a></li>
        <li><a href="/files">List Files</a></li>
        <li><a href="/env">Environment Variables</a></li>
      </ul>
    `);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Railway test server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📁 Files: http://localhost:${port}/files`);
  console.log(`🔧 Environment: http://localhost:${port}/env`);
});

module.exports = server; 