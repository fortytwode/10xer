// Test if Facebook API actually supports the multi-dimensional combinations
import { getAccountInsights } from './src/tools/get-account-insights.js';

console.log('🧪 Testing Facebook API Multi-Dimensional Breakdown Compatibility\\n');

const testCases = [
  {
    name: 'Age + Gender + Date (Multi-dimensional)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['age', 'gender'],
      time_range: { since: '2024-12-01', until: '2024-12-03' },
      time_increment: 1
    },
    expectation: 'Should return data with age, gender, and date_start fields'
  },
  
  {
    name: 'Placement + Date (Publisher Platform + Date)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['publisher_platform', 'platform_position'],
      time_range: { since: '2024-12-01', until: '2024-12-03' },
      time_increment: 1
    },
    expectation: 'Should return data with publisher_platform, platform_position, and date_start fields'
  },
  
  {
    name: 'Age + Date Only',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['age'],
      time_range: { since: '2024-12-01', until: '2024-12-03' },
      time_increment: 1
    },
    expectation: 'Should return data with age and date_start fields'
  },
  
  {
    name: 'Control: Single Age Breakdown (No Date)',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['age'],
      date_preset: 'last_7d'
    },
    expectation: 'Should return data with age field, aggregated over 7 days'
  }
];

async function testBreakdownCompatibility() {
  for (const testCase of testCases) {
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
            
            // Check for breakdown compatibility errors
            if (errorMsg.includes('breakdown') || errorMsg.includes('incompatible') || errorMsg.includes('combination')) {
              console.log('🚨 BREAKDOWN COMPATIBILITY ERROR - This combination is NOT supported by Facebook');
            } else {
              console.log('ℹ️ Different error (likely auth/permission issue)');
            }
          }
        } else {
          console.log('✅ API call succeeded (would return formatted data)');
          
          // Check if debug info shows the parameters were processed
          if (responseText.includes('enhancedFields') || responseText.includes('time_increment')) {
            console.log('✅ Parameters were processed correctly');
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Unexpected error:', error.message.substring(0, 100));
    }
    
    console.log('');
  }
}

// Also test parameter validation
console.log('🔍 First, testing parameter validation (before API calls):\\n');

const { ValidationSchemas, validateParameters } = await import('./src/utils/validation.js');

testCases.forEach((testCase, index) => {
  console.log(`--- Validating ${testCase.name} ---`);
  try {
    const validated = validateParameters(ValidationSchemas.accountInsights, testCase.args);
    console.log('✅ Parameters validate correctly');
    console.log('Validated breakdowns:', validated.breakdowns);
    console.log('Validated time_increment:', validated.time_increment);
  } catch (error) {
    console.log('❌ Parameter validation failed:', error.message);
  }
  console.log('');
});

console.log('\\n🚀 Now testing actual Facebook API calls:\\n');
await testBreakdownCompatibility();

console.log('\\n📊 Summary:');
console.log('- If you see "Facebook API Error" with breakdown/incompatible messages → Facebook does not support that combination');
console.log('- If you see "Ad account owner has NOT grant" errors → Parameters are valid, just need API access');
console.log('- This test reveals which multi-dimensional combinations Facebook actually supports');