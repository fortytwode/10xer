#!/usr/bin/env node

// Find the specific campaign across all ad accounts
import { getAccountInsights } from './src/tools/get-account-insights.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// List of available ad accounts from the previous query
const adAccounts = [
  { name: "Shamanth M. Rao", id: "act_28197910" },
  { name: "12276053", id: "act_12276053" },
  { name: "cooee GmbH", id: "act_51760926" },
  { name: "Dare Response", id: "act_52498732" },
  { name: "Gronda GmbH", id: "act_57981976" },
  { name: "komoot Ad Account", id: "act_59398233" },
  { name: "Mektoube.fr 2015", id: "act_59193846" },
  { name: "PuzzleSocial Inc. (Primary)", id: "act_353544526" },
  { name: "10151104698720167", id: "act_10151104698720167" },
  { name: "FluentU", id: "act_13198434" },
  { name: "1958399239636", id: "act_1958399239636" },
  { name: "1379172019002730", id: "act_1379172019002730" },
  { name: "FitMind LLC", id: "act_10203289427026501" },
  { name: "PuzzleSocial_01", id: "act_1375791262675758" },
  { name: "nanigans@puzzlesocial.com", id: "act_1394796007476310" },
  { name: "PuzzleSocial_02", id: "act_1384829268436076" },
  { name: "PuzzleNation", id: "act_259122360945472" },
  { name: "PuzzleSocial_06", id: "act_537087229755599" },
  { name: "PuzzleSocial_07", id: "act_537384743059181" },
  { name: "SplashLearn Primary Account", id: "act_1380799905550917" },
  { name: "DCC Canvas Internal", id: "act_624134531050868" },
  { name: "Expectful", id: "act_418002765052434" },
  { name: "Learn with Homer", id: "act_1668513836725808" },
  { name: "Facebook In House", id: "act_684723161658671" },
  { name: "BPF Primary Ad Account", id: "act_257111394653342" }
];

async function findCampaignInAccount(accountId, accountName) {
  console.log(`🔍 Searching in account: ${accountName} (${accountId})`);
  
  try {
    const result = await getAccountInsights({
      act_id: accountId,
      level: 'campaign',
      fields: ['campaign_name', 'campaign_id', 'spend', 'impressions', 'clicks'],
      date_preset: 'last_90d', // Look back 90 days for campaigns
      limit: 100
    });
    
    if (result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      // Check if the campaign name appears in the response
      if (responseText.includes('RSHQ-RT-Start_Trial-0618')) {
        console.log(`✅ FOUND CAMPAIGN in ${accountName}!`);
        console.log('📊 Campaign data:');
        console.log(responseText);
        return { accountId, accountName, found: true, data: responseText };
      } else {
        console.log(`   ❌ Campaign not found in ${accountName}`);
        return { accountId, accountName, found: false };
      }
    } else {
      console.log(`   ⚠️  No data returned from ${accountName}`);
      return { accountId, accountName, found: false };
    }
    
  } catch (error) {
    console.log(`   ❌ Error querying ${accountName}: ${error.message.substring(0, 80)}...`);
    return { accountId, accountName, found: false, error: error.message };
  }
}

async function searchAllAccounts() {
  console.log('🎯 Searching for campaign "RSHQ-RT-Start_Trial-0618" across all ad accounts...\n');
  
  const results = [];
  
  // Search through first 10 accounts to avoid hitting rate limits
  for (const account of adAccounts.slice(0, 10)) {
    const result = await findCampaignInAccount(account.id, account.name);
    results.push(result);
    
    if (result.found) {
      console.log('\n🎉 Campaign found! Now getting age/gender breakdown...\n');
      await getCampaignBreakdown(account.id, account.name);
      break;
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📋 Search Summary:');
  console.log('=' .repeat(80));
  
  const foundAccounts = results.filter(r => r.found);
  const errorAccounts = results.filter(r => r.error);
  
  console.log(`✅ Accounts with campaign: ${foundAccounts.length}`);
  console.log(`❌ Accounts with errors: ${errorAccounts.length}`);
  console.log(`🔍 Accounts searched: ${results.length}`);
  
  if (foundAccounts.length === 0) {
    console.log('\n💡 Campaign not found in searched accounts. Try:');
    console.log('1. Check if the campaign name is spelled correctly');
    console.log('2. Expand the date range (currently using last_90d)');
    console.log('3. Check more ad accounts');
  }
}

async function getCampaignBreakdown(accountId, accountName) {
  console.log(`📊 Getting age/gender breakdown for campaign in ${accountName}...`);
  
  try {
    const result = await getAccountInsights({
      act_id: accountId,
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
      filtering: [
        {
          field: 'campaign.name',
          operator: 'EQUAL',
          value: 'RSHQ-RT-Start_Trial-0618'
        }
      ],
      date_preset: 'last_90d',
      time_increment: 1,
      limit: 1000
    });
    
    if (result.content && result.content[0]) {
      console.log('✅ Age/Gender breakdown retrieved successfully!');
      console.log('📈 BREAKDOWN RESULTS:');
      console.log('=' .repeat(100));
      console.log(result.content[0].text);
      console.log('=' .repeat(100));
    } else {
      console.log('⚠️  No breakdown data returned');
    }
    
  } catch (error) {
    console.error('❌ Error getting breakdown:', error.message);
  }
}

searchAllAccounts().catch(console.error);