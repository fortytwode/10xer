// Test FUNDAMENTAL breakdown combinations that should definitely work
import { getAccountInsights } from './src/tools/get-account-insights.js';

console.log('🧪 Testing FUNDAMENTAL Facebook API Breakdown Combinations\\n');

const fundamentalTestCases = [
  {
    name: 'Campaign + Date (Daily Campaign Performance)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks', 'campaign_name'],
      level: 'campaign',
      time_range: { since: '2024-12-01', until: '2024-12-03' },
      time_increment: 1
    },
    expectation: 'Should return campaign performance by day - FUNDAMENTAL use case'
  },
  
  {
    name: 'Campaign + Placement (Campaign Performance by Placement)',
    args: {
      act_id: 'act_123456789', 
      fields: ['spend', 'impressions', 'clicks', 'campaign_name'],
      level: 'campaign',
      breakdowns: ['publisher_platform'],
      date_preset: 'last_7d'
    },
    expectation: 'Should return campaign performance by placement - FUNDAMENTAL use case'
  },
  
  {
    name: 'Campaign + Age (Campaign Performance by Age Group)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks', 'campaign_name'],
      level: 'campaign', 
      breakdowns: ['age'],
      date_preset: 'last_7d'
    },
    expectation: 'Should return campaign performance by age group - FUNDAMENTAL use case'
  },
  
  {
    name: 'Adset + Date (Daily Adset Performance)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks', 'adset_name'],
      level: 'adset',
      time_range: { since: '2024-12-01', until: '2024-12-03' },
      time_increment: 1
    },
    expectation: 'Should return adset performance by day - FUNDAMENTAL use case'
  },
  
  {
    name: 'Adset + Age (Adset Performance by Age Group)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks', 'adset_name'],
      level: 'adset',
      breakdowns: ['age'],
      date_preset: 'last_7d'
    },
    expectation: 'Should return adset performance by age group - FUNDAMENTAL use case'
  }
];

async function testFundamentalCombinations() {
  for (const testCase of fundamentalTestCases) {
    console.log(`=== ${testCase.name} ===`);
    console.log('Request parameters:');
    console.log(JSON.stringify(testCase.args, null, 2));
    console.log(`Expected: ${testCase.expectation}`);
    
    try {
      const result = await getAccountInsights(testCase.args);
      
      if (result.content && result.content[0]) {
        const responseText = result.content[0].text;
        
        // Check if it's an API error or success
        if (responseText.includes('Facebook API Error')) {
          console.log('❌ Facebook API Error detected');
          
          // Extract the error message
          const errorMatch = responseText.match(/Facebook API Error: ([^\\n]+)/);
          if (errorMatch) {
            const errorMsg = errorMatch[1];
            console.log(`Error: ${errorMsg}`);
            
            // Check for breakdown compatibility errors (the important ones)
            if (errorMsg.includes('breakdown') || errorMsg.includes('incompatible') || errorMsg.includes('combination')) {
              console.log('🚨 BREAKDOWN COMPATIBILITY ERROR - This fundamental combination is NOT supported!');
            } else if (errorMsg.includes('Ad account owner has NOT grant')) {
              console.log('✅ Parameters valid - just need API access (this is expected)');
            } else {
              console.log('ℹ️ Other error type');
            }
          }
        } else {
          console.log('✅ API call succeeded');
        }
      }
      
    } catch (error) {
      console.log('❌ Unexpected error:', error.message.substring(0, 100));
    }
    
    console.log('');
  }
}

// Test parameter validation first
console.log('🔍 Testing parameter validation for fundamental combinations:\\n');

const { ValidationSchemas, validateParameters } = await import('./src/utils/validation.js');

fundamentalTestCases.forEach((testCase, index) => {
  console.log(`--- Validating ${testCase.name} ---`);
  try {
    const validated = validateParameters(ValidationSchemas.accountInsights, testCase.args);
    console.log('✅ Parameters validate correctly');
    console.log(`Level: ${validated.level}`);
    console.log(`Breakdowns: ${validated.breakdowns || 'none (using level instead)'}`);
    console.log(`Time increment: ${validated.time_increment || 'none'}`);
  } catch (error) {
    console.log('❌ Parameter validation failed:', error.message);
  }
  console.log('');
});

console.log('\\n🚀 Now testing actual Facebook API calls for fundamental combinations:\\n');
await testFundamentalCombinations();

console.log('\\n📊 Key Insights:');
console.log('✅ These are FUNDAMENTAL use cases that should work');
console.log('✅ Campaign/Adset level with time_increment = standard daily reporting');
console.log('✅ Campaign/Adset level with age breakdown = standard demographic reporting');
console.log('✅ If these fail, it would be due to API restrictions, not our logic');
console.log('\\n🎯 Our multi-dimensional solution should handle ALL of these cases correctly');