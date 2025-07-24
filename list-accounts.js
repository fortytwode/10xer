#!/usr/bin/env node

// List Facebook ad accounts to find the correct account ID
import { listAdAccounts } from './src/tools/list-ad-accounts.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listAccounts() {
  console.log('🔍 Listing Facebook ad accounts...\n');
  
  try {
    const result = await listAdAccounts({});
    
    console.log('✅ Successfully retrieved ad accounts!\n');
    
    if (result.content && result.content[0]) {
      console.log('📋 Available Ad Accounts:');
      console.log('=' .repeat(80));
      console.log(result.content[0].text);
      console.log('=' .repeat(80));
    } else {
      console.log('⚠️  No content returned from API');
    }
    
  } catch (error) {
    console.error('❌ Error listing ad accounts:', error.message);
    
    if (error.message.includes('authentication') || error.message.includes('token')) {
      console.log('\n🔐 Authentication issue detected:');
      console.log('1. The access token may be expired');
      console.log('2. The token may not have the required permissions');
      console.log('3. Try running the Facebook login process to get a fresh token');
    }
  }
}

listAccounts().catch(console.error);