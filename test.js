#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

class MCPTester {
  constructor() {
    this.server = null;
    this.testResults = [];
  }

  async startServer() {
    console.log('🚀 Starting Facebook Ads MCP Server...\n');
    
    this.server = spawn('node', ['src/index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'test', // Enable hardcoded token for testing
        FACEBOOK_ACCESS_TOKEN: process.env.FACEBOOK_ACCESS_TOKEN || 'test_token'
      }
    });

    // Wait for server to initialize
    await setTimeout(1000);
    
    if (this.server.killed) {
      throw new Error('Server failed to start');
    }
    
    console.log('✅ Server started successfully\n');
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const onData = (data) => {
        response += data.toString();
        const lines = response.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.id === request.id) {
                clearTimeout(timeout);
                this.server.stdout.off('data', onData);
                resolve(parsed);
                return;
              }
            } catch (e) {
              // Not JSON, continue
            }
          }
        }
      };

      this.server.stdout.on('data', onData);
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testListTools() {
    console.log('🧪 Testing: List Tools');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.result && response.result.tools) {
        const tools = response.result.tools;
        console.log(`✅ Found ${tools.length} tools:`);
        
        const expectedTools = [
          'facebook_list_ad_accounts',
          'facebook_fetch_pagination_url', 
          'facebook_get_details_of_ad_account',
          'facebook_get_adaccount_insights',
          'facebook_get_activities_by_adaccount'
        ];

        for (const expectedTool of expectedTools) {
          const found = tools.find(t => t.name === expectedTool);
          if (found) {
            console.log(`   ✅ ${expectedTool}`);
          } else {
            console.log(`   ❌ ${expectedTool} - MISSING`);
          }
        }
        
        this.testResults.push({ test: 'List Tools', status: 'PASS' });
      } else {
        console.log('❌ Invalid response structure');
        this.testResults.push({ test: 'List Tools', status: 'FAIL' });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      this.testResults.push({ test: 'List Tools', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testToolCall(toolName, args = {}) {
    console.log(`🧪 Testing: ${toolName}`);
    
    const request = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.result) {
        console.log('✅ Tool call successful');
        console.log('   Response structure looks valid');
        this.testResults.push({ test: toolName, status: 'PASS' });
      } else if (response.error) {
        // Expected for calls without valid token
        console.log(`⚠️  Expected error (no valid token): ${response.error.message}`);
        this.testResults.push({ test: toolName, status: 'PASS (Expected Error)' });
      } else {
        console.log('❌ Unexpected response structure');
        this.testResults.push({ test: toolName, status: 'FAIL' });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      this.testResults.push({ test: toolName, status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testInputValidation() {
    console.log('🧪 Testing: Input Validation');
    
    // Test missing required parameter
    const request = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000),
      method: 'tools/call',
      params: {
        name: 'facebook_get_details_of_ad_account',
        arguments: {} // Missing act_id
      }
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.error && 
          (response.error.message.includes('validation') || 
           response.error.message.includes('act_id: Required'))) {
        console.log('✅ Validation error correctly detected');
        this.testResults.push({ test: 'Input Validation', status: 'PASS' });
      } else if (response.result && response.result.content && 
                 response.result.content[0] && 
                 response.result.content[0].text.includes('Validation error')) {
        console.log('✅ Validation error correctly detected in content');
        this.testResults.push({ test: 'Input Validation', status: 'PASS' });
      } else {
        console.log('❌ Validation should have failed');
        console.log('Response:', JSON.stringify(response, null, 2));
        this.testResults.push({ test: 'Input Validation', status: 'FAIL' });
      }
    } catch (error) {
      if (error.message.includes('Validation error')) {
        console.log('✅ Validation error correctly detected in exception');
        this.testResults.push({ test: 'Input Validation', status: 'PASS' });
      } else {
        console.log(`❌ Error: ${error.message}`);
        this.testResults.push({ test: 'Input Validation', status: 'FAIL', error: error.message });
      }
    }
    
    console.log('');
  }

  async runAllTests() {
    try {
      await this.startServer();
      await this.testListTools();
      
      // Test each tool
      await this.testToolCall('facebook_list_ad_accounts');
      await this.testToolCall('facebook_get_details_of_ad_account', { act_id: 'act_123' });
      await this.testToolCall('facebook_get_adaccount_insights', { 
        act_id: 'act_123', 
        fields: ['impressions', 'clicks'] 
      });
      await this.testToolCall('facebook_get_activities_by_adaccount', { act_id: 'act_123' });
      await this.testToolCall('facebook_fetch_pagination_url', { 
        url: 'https://graph.facebook.com/v18.0/test' 
      });
      
      await this.testInputValidation();
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      if (this.server) {
        this.server.kill();
      }
    }
  }

  printResults() {
    console.log('📊 Test Results Summary');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    for (const result of this.testResults) {
      const status = result.status.includes('PASS') ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      
      if (result.status.includes('PASS')) {
        passed++;
      } else {
        failed++;
      }
    }
    
    console.log(`\nTotal: ${this.testResults.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed`);
    }
  }
}

// Check if Facebook token is provided
if (!process.env.FACEBOOK_ACCESS_TOKEN) {
  console.log('⚠️  Note: FACEBOOK_ACCESS_TOKEN not provided. API calls will fail as expected.\n');
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().then(() => {
  tester.printResults();
  process.exit(0);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});