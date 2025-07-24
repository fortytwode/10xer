#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class AdThumbnailTester {
  constructor() {
    this.server = null;
  }

  async startServer() {
    console.log('🚀 Starting Facebook Ads MCP Server for thumbnail testing...\n');
    
    this.server = spawn('node', ['src/index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'production'
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
      }, 30000); // 30 second timeout for API calls

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

  async testAdThumbnails(adIds, resolution = 'all', includeAdDetails = true) {
    console.log(`🖼️ Testing: Get Ad Thumbnails for ${adIds.length} ad(s)`);
    console.log(`Ad IDs: ${adIds.join(', ')}`);
    console.log(`Resolution: ${resolution}`);
    console.log(`Include Details: ${includeAdDetails}\n`);
    
    const request = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000),
      method: 'tools/call',
      params: {
        name: 'facebook_get_ad_thumbnails',
        arguments: {
          ad_ids: adIds,
          resolution: resolution,
          include_ad_details: includeAdDetails
        }
      }
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.result && response.result.content) {
        console.log('✅ Ad thumbnails retrieved successfully!\n');
        
        // Display the formatted response
        const content = response.result.content[0];
        if (content.type === 'text') {
          console.log('📋 RESPONSE:\n');
          console.log(content.text);
        }
        
        return { success: true, data: response.result };
      } else if (response.error) {
        console.log(`❌ Error: ${response.error.message}`);
        if (response.error.data) {
          console.log('Error details:', response.error.data);
        }
        return { success: false, error: response.error };
      } else {
        console.log('❌ Unexpected response structure');
        console.log('Response:', JSON.stringify(response, null, 2));
        return { success: false, error: 'Unexpected response structure' };
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runTest() {
    try {
      await this.startServer();
      
      // Test with the Akiflow ad ID
      const akiflowAdId = '120230959651980230';
      const result = await this.testAdThumbnails(
        [akiflowAdId], 
        'all',  // Get all resolution options
        true    // Include ad details
      );
      
      if (result.success) {
        console.log('\n🎉 Test completed successfully!');
      } else {
        console.log('\n❌ Test failed:', result.error);
      }
      
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      if (this.server) {
        this.server.kill();
      }
    }
  }
}

// Check if Facebook token is provided
if (!process.env.FACEBOOK_ACCESS_TOKEN) {
  console.log('❌ Error: FACEBOOK_ACCESS_TOKEN not provided in .env file');
  console.log('Please ensure your .env file contains a valid Facebook access token.');
  process.exit(1);
}

// Run the test
console.log('🎯 Testing Facebook Ad Thumbnails Tool');
console.log('=====================================\n');

const tester = new AdThumbnailTester();
tester.runTest().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});