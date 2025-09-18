#!/usr/bin/env node

// Real-time connection monitor to see what Claude.ai actually does
import https from 'https';

let requestCount = 0;

function logRequest(req, res, next) {
  requestCount++;
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`\n🔍 [${requestCount}] ${timestamp} - ${req.method} ${req.originalUrl}`);
  console.log(`   User-Agent: ${userAgent}`);
  console.log(`   Headers:`, JSON.stringify(req.headers, null, 4));
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body, null, 4));
  }
  
  // Detect Claude.ai requests
  if (userAgent.toLowerCase().includes('claude') || 
      userAgent.toLowerCase().includes('anthropic') ||
      req.originalUrl.includes('mcp') || 
      req.originalUrl.includes('manifest')) {
    console.log(`   🚨 CLAUDE.AI REQUEST DETECTED!`);
  }
  
  next();
}

// Monitor Railway logs in real-time
function monitorRailwayLogs() {
  console.log('📡 Starting Railway logs monitor...\n');
  
  const spawn = require('child_process').spawn;
  const logProcess = spawn('railway', ['logs', '--follow'], { 
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true 
  });
  
  logProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Claude') || output.includes('mcp') || output.includes('manifest')) {
      console.log('📊 RAILWAY LOG:', output.trim());
    }
  });
  
  logProcess.stderr.on('data', (data) => {
    console.log('❌ RAILWAY ERROR:', data.toString().trim());
  });
}

// Test connection endpoints that Claude.ai might try
async function testAllEndpoints() {
  const testEndpoints = [
    'https://10xer-production.up.railway.app/test-manifest/current',
    'https://10xer-production.up.railway.app/mcp',
    'https://10xer-production.up.railway.app/mcp?sessionId=test',
    'https://10xer-production.up.railway.app/auth/callback',
    'https://10xer-production.up.railway.app/.well-known/ai-plugin.json'
  ];
  
  console.log('🧪 TESTING ALL POSSIBLE ENDPOINTS CLAUDE.AI MIGHT USE:\n');
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { 'User-Agent': 'Claude-User' }
      });
      
      console.log(`${response.ok ? '✅' : '❌'} ${endpoint}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.log(`   Error: ${text.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
}

// Simulate what happens when Claude.ai clicks "Connect"
async function simulateConnectFlow() {
  console.log('🔗 SIMULATING EXACT "CONNECT" BUTTON CLICK:\n');
  
  try {
    // 1. Claude.ai fetches manifest
    console.log('1️⃣ Fetching manifest...');
    const manifestResponse = await fetch('https://10xer-production.up.railway.app/test-manifest/current');
    const manifest = await manifestResponse.json();
    console.log(`   ✅ Manifest fetched: ${manifest.name}`);
    
    // 2. Claude.ai tries to establish SSE connection (GET)
    console.log('2️⃣ Attempting SSE connection...');
    const sseResponse = await fetch('https://10xer-production.up.railway.app/mcp', {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Claude-User'
      }
    });
    
    console.log(`   Status: ${sseResponse.status}`);
    if (sseResponse.ok) {
      console.log(`   ✅ SSE connection accepted`);
      const sseData = await sseResponse.text();
      console.log(`   SSE Data: ${sseData.substring(0, 200)}...`);
    } else {
      console.log(`   ❌ SSE connection failed`);
      const errorText = await sseResponse.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
    }
    
    // 3. Claude.ai sends initialization via POST
    console.log('3️⃣ Sending MCP initialization...');
    const initResponse = await fetch('https://10xer-production.up.railway.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-User'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: {
            name: "claude-ai",
            version: "0.1.0"
          }
        }
      })
    });
    
    console.log(`   Status: ${initResponse.status}`);
    if (initResponse.ok) {
      const initResult = await initResponse.json();
      console.log(`   ✅ Initialization successful`);
      console.log(`   Protocol: ${initResult.result?.protocolVersion}`);
    } else {
      console.log(`   ❌ Initialization failed`);
      const errorText = await initResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`❌ Connection simulation failed: ${error.message}`);
  }
}

console.log('🎯 CLAUDE.AI CONNECTION MONITOR');
console.log('This will show you EXACTLY what happens when you click Connect\n');

// Run all tests
await testAllEndpoints();
await simulateConnectFlow();

console.log('\n📱 NOW CLICK "CONNECT" IN CLAUDE.AI AND WATCH THE LOGS');
console.log('🔍 Monitor Railway logs with: railway logs --follow');
console.log('\n(This monitor stays running to capture real requests)');

// Keep process alive to monitor
setInterval(() => {}, 1000);