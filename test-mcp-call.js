// Test MCP call simulation
import { getAccountInsights } from './src/tools/get-account-insights.js';

console.log('🧪 Testing MCP call simulation...\n');

// Test different scenarios
const testCases = [
  {
    name: 'Daily breakdown request',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      time_range: { since: '2024-12-01', until: '2024-12-07' },
      time_increment: 1
    }
  },
  {
    name: 'Placement breakdown request', 
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['placement'],
      date_preset: 'last_7d'
    }
  },
  {
    name: 'Demographic breakdown request',
    args: {
      act_id: 'act_123456789', 
      fields: ['spend', 'impressions', 'clicks'],
      breakdowns: ['age', 'gender'],
      date_preset: 'last_7d'
    }
  },
  {
    name: 'Simple insights request',
    args: {
      act_id: 'act_123456789',
      fields: ['spend', 'impressions', 'clicks'],
      date_preset: 'last_7d'
    }
  }
];

for (const testCase of testCases) {
  console.log(`=== ${testCase.name} ===`);
  
  try {
    const result = await getAccountInsights(testCase.args);
    console.log('✅ Function executed successfully');
    console.log('📊 Response type:', typeof result);
    console.log('📝 Has content:', !!result.content);
    
    if (result.content && result.content[0]) {
      const text = result.content[0].text;
      console.log('📋 Response preview:', text.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.log('⚠️ Expected error (API access):', error.message.substring(0, 80));
  }
  
  console.log('');
}