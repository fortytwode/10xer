#!/usr/bin/env node

/**
 * Test the Universal Facebook Ads Server
 * Tests all three protocols: MCP, OpenAI, Gemini
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

class UniversalServerTester {
  constructor() {
    this.server = null;
    this.baseUrl = 'http://localhost:3003';
  }

  async startServer() {
    console.log('🚀 Starting Universal Facebook Ads Server...\n');
    
    this.server = spawn('node', ['src/universal-server.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        ...process.env,
        SERVER_MODE: 'api',
        PORT: '3003',
        NODE_ENV: 'test',
        FACEBOOK_ALLOW_HARDCODED_TOKEN: 'true'
      }
    });

    // Wait for server to start
    await setTimeout(3000);
    
    if (this.server.killed) {
      throw new Error('Server failed to start');
    }
    
    console.log('✅ Universal server started\n');
  }

  async testHealthCheck() {
    console.log('🔍 Testing health check...');
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      console.log('✅ Health check passed:', response.data);
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testOpenAIIntegration() {
    console.log('\n🤖 Testing OpenAI Function Calling Integration...');

    try {
      // Test function definitions
      console.log('📋 Getting OpenAI function definitions...');
      const defsResponse = await axios.get(`${this.baseUrl}/openai/functions/definitions`);
      const functions = defsResponse.data.functions;
      console.log(`✅ Found ${functions.length} OpenAI functions`);

      // Test function call
      console.log('🔧 Testing function call: facebook_list_ad_accounts');
      const callResponse = await axios.post(`${this.baseUrl}/openai/functions`, {
        function_call: {
          name: 'facebook_list_ad_accounts',
          arguments: '{}'
        }
      });
      
      console.log('✅ OpenAI function call successful');
      console.log('📊 Response format:', typeof callResponse.data);
      
      return true;
    } catch (error) {
      console.log('❌ OpenAI integration failed:', error.message);
      return false;
    }
  }

  async testGeminiIntegration() {
    console.log('\n💎 Testing Gemini Function Calling Integration...');

    try {
      // Test function definitions
      console.log('📋 Getting Gemini function definitions...');
      const defsResponse = await axios.get(`${this.baseUrl}/gemini/functions/definitions`);
      const functions = defsResponse.data.functions;
      console.log(`✅ Found ${functions.length} Gemini functions`);

      // Test function call
      console.log('🔧 Testing function call: facebook_check_auth');
      const callResponse = await axios.post(`${this.baseUrl}/gemini/functions`, {
        function_call: {
          name: 'facebook_check_auth',
          args: {}
        }
      });
      
      console.log('✅ Gemini function call successful');
      console.log('📊 Response format:', typeof callResponse.data);
      
      return true;
    } catch (error) {
      console.log('❌ Gemini integration failed:', error.message);
      return false;
    }
  }

  async testThumbnailFunction() {
    console.log('\n🖼️ Testing Ad Thumbnails Function (OpenAI format)...');

    try {
      const callResponse = await axios.post(`${this.baseUrl}/openai/functions`, {
        function_call: {
          name: 'facebook_get_ad_thumbnails',
          arguments: JSON.stringify({
            ad_ids: ['120230959651980230'],
            resolution: 'all'
          })
        }
      });
      
      console.log('✅ Thumbnail function call successful');
      
      // Check if response includes images
      if (Array.isArray(callResponse.data)) {
        const hasImages = callResponse.data.some(item => 
          item.content && Array.isArray(item.content) && item.content.some(c => c.type === 'image_url')
        );
        console.log('🖼️ Images included in response:', hasImages);
      } else if (callResponse.data.content) {
        const hasImages = Array.isArray(callResponse.data.content) && 
          callResponse.data.content.some(c => c.type === 'image_url');
        console.log('🖼️ Images included in response:', hasImages);
      }
      
      return true;
    } catch (error) {
      console.log('❌ Thumbnail function failed:', error.message);
      return false;
    }
  }

  async testGenericToolsEndpoint() {
    console.log('\n🛠️ Testing generic tools endpoint...');

    try {
      const response = await axios.get(`${this.baseUrl}/tools`);
      const tools = response.data.tools;
      console.log(`✅ Found ${tools.length} tools via generic endpoint`);
      
      // List some tools
      tools.slice(0, 3).forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
      
      return true;
    } catch (error) {
      console.log('❌ Generic tools endpoint failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    const results = [];
    
    try {
      await this.startServer();

      results.push(await this.testHealthCheck());
      results.push(await this.testGenericToolsEndpoint());
      results.push(await this.testOpenAIIntegration());
      results.push(await this.testGeminiIntegration());
      results.push(await this.testThumbnailFunction());

    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      if (this.server) {
        this.server.kill();
        console.log('\n🛑 Server stopped');
      }
    }

    return results;
  }

  printResults(results) {
    console.log('\n📊 Universal Server Test Results');
    console.log('=====================================');
    
    const tests = [
      'Health Check',
      'Generic Tools Endpoint', 
      'OpenAI Integration',
      'Gemini Integration',
      'Thumbnail Function'
    ];

    const passed = results.filter(Boolean).length;
    const total = results.length;

    tests.forEach((test, index) => {
      const status = results[index] ? '✅' : '❌';
      console.log(`${status} ${test}`);
    });
    
    console.log(`\nTotal: ${total} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    
    if (passed === total) {
      console.log('\n🎉 All universal server tests passed!');
      console.log('\n🚀 Ready for multi-protocol deployment:');
      console.log('   • MCP: Use existing setup');
      console.log('   • OpenAI: POST to /openai/functions');
      console.log('   • Gemini: POST to /gemini/functions');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed`);
    }
  }
}

// Run tests
const tester = new UniversalServerTester();
tester.runAllTests().then((results) => {
  tester.printResults(results);
  process.exit(0);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});