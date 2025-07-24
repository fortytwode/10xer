#!/usr/bin/env node

// Query Facebook Ads API for age and gender breakdown for specific campaign
import { getAccountInsights } from './src/tools/get-account-insights.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function queryCampaignBreakdown() {
  console.log('🔍 Querying Facebook Ads API for campaign age/gender breakdown...\n');
  
  // Parameters for the API call
  const params = {
    act_id: process.env.FACEBOOK_AD_ACCOUNT_ID || 'act_YOUR_ACCOUNT_ID_HERE',
    level: 'campaign',
    fields: [
      'spend', 
      'impressions', 
      'clicks', 
      'actions',
      'conversions',
      'ctr',
      'cpc',
      'cpm',
      'campaign_name',
      'campaign_id'
    ],
    breakdowns: ['age', 'gender'],
    // Filter for the specific campaign
    filtering: [
      {
        field: 'campaign.name',
        operator: 'EQUAL',
        value: 'RSHQ-RT-Start_Trial-0618'
      }
    ],
    // Recent data - adjust dates as needed
    date_preset: 'last_30d',
    // Alternative: use custom date range
    // time_range: {
    //   since: '2024-12-01',
    //   until: '2024-12-31'
    // },
    time_increment: 1, // Daily breakdown
    limit: 1000
  };

  try {
    console.log('📊 API Parameters:');
    console.log(JSON.stringify(params, null, 2));
    console.log('\n🚀 Making API call...\n');
    
    const result = await getAccountInsights(params);
    
    console.log('✅ API call completed successfully!\n');
    
    if (result.content && result.content[0]) {
      console.log('📈 Results:');
      console.log('=' .repeat(80));
      console.log(result.content[0].text);
      console.log('=' .repeat(80));
    } else {
      console.log('⚠️  No content returned from API');
    }
    
  } catch (error) {
    console.error('❌ Error querying Facebook API:', error.message);
    
    if (error.message.includes('authentication') || error.message.includes('token')) {
      console.log('\n🔐 Authentication required:');
      console.log('1. Make sure you have set up your Facebook App credentials');
      console.log('2. Run the Facebook login process to get an access token');
      console.log('3. Ensure your .env file contains the correct FACEBOOK_AD_ACCOUNT_ID');
    }
    
    if (error.message.includes('campaign')) {
      console.log('\n📋 Campaign filtering tips:');
      console.log('1. Make sure the campaign name "RSHQ-RT-Start_Trial-0618" exists');
      console.log('2. Check if the campaign is active and has data in the specified date range');
      console.log('3. Verify you have access to this campaign in your ad account');
    }
  }
}

// Alternative query without campaign filtering (to get all campaigns with breakdowns)
async function queryAllCampaignsBreakdown() {
  console.log('🔍 Querying all campaigns with age/gender breakdown...\n');
  
  const params = {
    act_id: process.env.FACEBOOK_AD_ACCOUNT_ID || 'act_YOUR_ACCOUNT_ID_HERE',
    level: 'campaign',
    fields: [
      'spend', 
      'impressions', 
      'clicks', 
      'actions',
      'conversions',
      'ctr',
      'cpc',
      'cpm',
      'campaign_name',
      'campaign_id'
    ],
    breakdowns: ['age', 'gender'],
    date_preset: 'last_30d',
    time_increment: 1,
    limit: 1000
  };

  try {
    console.log('📊 API Parameters (All Campaigns):');
    console.log(JSON.stringify(params, null, 2));
    console.log('\n🚀 Making API call...\n');
    
    const result = await getAccountInsights(params);
    
    console.log('✅ API call completed successfully!\n');
    
    if (result.content && result.content[0]) {
      console.log('📈 Results (All Campaigns):');
      console.log('=' .repeat(80));
      console.log(result.content[0].text);
      console.log('=' .repeat(80));
    } else {
      console.log('⚠️  No content returned from API');
    }
    
  } catch (error) {
    console.error('❌ Error querying Facebook API:', error.message);
  }
}

// Run the queries
async function main() {
  console.log('🎯 Facebook Ads Campaign Breakdown Query\n');
  
  // First try to query the specific campaign
  await queryCampaignBreakdown();
  
  console.log('\n' + '='.repeat(100) + '\n');
  
  // Then query all campaigns as a fallback
  await queryAllCampaignsBreakdown();
}

main().catch(console.error);