#!/usr/bin/env node

// Complete Claude.ai connector behavior simulation
import https from 'https';
import { URL } from 'url';

const USER_AGENT = 'Claude-User';

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': options.accept || 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function simulateClaudeConnector(manifestUrl) {
  console.log(`🤖 SIMULATING CLAUDE.AI CONNECTOR FOR: ${manifestUrl}`);
  console.log('=' .repeat(80));

  try {
    // STEP 1: Fetch manifest (what Claude.ai does first)
    console.log('📋 STEP 1: Fetching manifest...');
    const manifestResponse = await httpRequest(manifestUrl);
    
    console.log(`   Status: ${manifestResponse.status}`);
    if (manifestResponse.status !== 200) {
      console.log('   ❌ FAIL: Cannot fetch manifest');
      return false;
    }

    let manifest;
    try {
      manifest = JSON.parse(manifestResponse.body);
      console.log('   ✅ Manifest JSON parsed successfully');
    } catch (e) {
      console.log('   ❌ FAIL: Invalid JSON in manifest');
      return false;
    }

    // STEP 2: Validate manifest structure
    console.log('🔍 STEP 2: Validating manifest structure...');
    const required = ['name', 'version', 'tools'];
    const missing = required.filter(field => !manifest[field]);
    if (missing.length > 0) {
      console.log(`   ❌ FAIL: Missing required fields: ${missing.join(', ')}`);
      return false;
    }
    console.log('   ✅ Required fields present');

    if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
      console.log('   ❌ FAIL: No tools array or empty tools');
      return false;
    }
    console.log(`   ✅ Found ${manifest.tools.length} tool(s)`);

    // STEP 3: Determine connection endpoint
    console.log('🔗 STEP 3: Determining connection endpoint...');
    let connectionUrl;
    
    if (manifest.api && manifest.api.base_url) {
      // Use api.base_url + /mcp (standard)
      connectionUrl = manifest.api.base_url.endsWith('/') 
        ? manifest.api.base_url + 'mcp'
        : manifest.api.base_url + '/mcp';
      console.log(`   📍 Using api.base_url: ${connectionUrl}`);
    } else {
      // Fallback: try manifest URL as connection endpoint
      connectionUrl = manifestUrl;
      console.log(`   📍 Fallback: Using manifest URL: ${connectionUrl}`);
    }

    // STEP 4: Test MCP initialization
    console.log('⚡ STEP 4: Testing MCP initialization...');
    const initPayload = {
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
    };

    const initResponse = await httpRequest(connectionUrl, {
      method: 'POST',
      body: JSON.stringify(initPayload),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${initResponse.status}`);
    if (initResponse.status !== 200) {
      console.log('   ❌ FAIL: MCP initialization failed');
      console.log(`   Response: ${initResponse.body.substring(0, 200)}...`);
      return false;
    }

    let initResult;
    try {
      initResult = JSON.parse(initResponse.body);
      console.log('   ✅ MCP initialization response parsed');
    } catch (e) {
      console.log('   ❌ FAIL: Invalid JSON in MCP response');
      return false;
    }

    // Validate MCP response
    if (!initResult.result || !initResult.result.protocolVersion) {
      console.log('   ❌ FAIL: Invalid MCP initialization response');
      console.log(`   Response: ${JSON.stringify(initResult, null, 2)}`);
      return false;
    }
    console.log(`   ✅ Protocol version: ${initResult.result.protocolVersion}`);

    // STEP 5: Test tools/list
    console.log('🛠️  STEP 5: Testing tools list...');
    const toolsPayload = {
      jsonrpc: "2.0", 
      id: 1,
      method: "tools/list",
      params: {}
    };

    const toolsResponse = await httpRequest(connectionUrl, {
      method: 'POST',
      body: JSON.stringify(toolsPayload)
    });

    if (toolsResponse.status !== 200) {
      console.log('   ❌ FAIL: Tools list failed');
      return false;
    }

    let toolsResult;
    try {
      toolsResult = JSON.parse(toolsResponse.body);
      console.log('   ✅ Tools list response parsed');
    } catch (e) {
      console.log('   ❌ FAIL: Invalid JSON in tools response');
      return false;
    }

    if (!toolsResult.result || !Array.isArray(toolsResult.result.tools)) {
      console.log('   ❌ FAIL: Invalid tools list response');
      return false;
    }

    const toolCount = toolsResult.result.tools.length;
    console.log(`   ✅ Found ${toolCount} available tool(s)`);

    // STEP 6: Test notification/initialized (Claude.ai sends this)
    console.log('📢 STEP 6: Testing initialized notification...');
    const notifyPayload = {
      jsonrpc: "2.0",
      method: "notifications/initialized"
    };

    const notifyResponse = await httpRequest(connectionUrl, {
      method: 'POST', 
      body: JSON.stringify(notifyPayload)
    });

    if (notifyResponse.status === 200) {
      console.log('   ✅ Notifications handled correctly');
    } else {
      console.log('   ⚠️  Notifications not handled (non-critical)');
    }

    console.log('🎉 SUCCESS: All steps passed - connector should work in Claude.ai');
    return true;

  } catch (error) {
    console.log('❌ SIMULATION FAILED:', error.message);
    return false;
  }
}

// Test all variants
const variants = [
  'https://10xer-production.up.railway.app/test-manifest/current',
  'https://10xer-production.up.railway.app/test-manifest/mcp', 
  'https://10xer-production.up.railway.app/test-manifest/strict',
  'https://10xer-production.up.railway.app/test-manifest/oauth',
  'https://10xer-production.up.railway.app/test-manifest/versioned',
  'https://10xer-production.up.railway.app/test-manifest/minimal'
];

console.log('🧪 CLAUDE.AI CONNECTOR SIMULATION TEST');
console.log('This simulates EXACTLY what Claude.ai does when adding a connector\n');

for (const variant of variants) {
  const success = await simulateClaudeConnector(variant);
  console.log(`\n${'='.repeat(80)}\n`);
  
  if (success) {
    console.log(`✅ RECOMMENDED: Use ${variant} in Claude.ai`);
    break; // Found working variant
  }
}

console.log('🎯 SIMULATION COMPLETE');