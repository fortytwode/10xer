#!/usr/bin/env node

// Test to verify how Zod handles null values
import { ValidationSchemas, validateParameters } from './src/utils/validation.js';

console.log('🧪 Testing null time_increment handling\n');

const testCases = [
  {
    name: "time_increment: null (Claude's actual request)",
    params: {
      act_id: 'act_51760926',
      fields: ['spend'],
      time_range: {
        since: '2025-05-01',
        until: '2025-09-30'
      },
      time_increment: null,
      organization_id: 'test_org'
    }
  },
  {
    name: "time_increment: undefined",
    params: {
      act_id: 'act_51760926',
      fields: ['spend'],
      time_range: {
        since: '2025-05-01',
        until: '2025-09-30'
      },
      time_increment: undefined,
      organization_id: 'test_org'
    }
  },
  {
    name: "time_increment: 'monthly'",
    params: {
      act_id: 'act_51760926',
      fields: ['spend'],
      time_range: {
        since: '2025-05-01',
        until: '2025-09-30'
      },
      time_increment: 'monthly',
      organization_id: 'test_org'
    }
  },
  {
    name: "no time_increment property",
    params: {
      act_id: 'act_51760926',
      fields: ['spend'],
      time_range: {
        since: '2025-05-01',
        until: '2025-09-30'
      },
      organization_id: 'test_org'
    }
  }
];

testCases.forEach(testCase => {
  console.log(`📋 Testing: ${testCase.name}`);
  console.log('Input:', JSON.stringify(testCase.params, null, 2));
  
  try {
    const validated = validateParameters(ValidationSchemas.accountInsights, testCase.params);
    console.log('✅ Validation PASSED');
    console.log('Output:', JSON.stringify(validated, null, 2));
    
    // Simulate the parameter processing logic
    const { act_id, fields, level, ...otherParams } = validated;
    let finalParams = { ...otherParams };

    const insightsParams = {
      fields: fields.join(','),
      level: level || 'account',
      ...finalParams,
    };

    // Remove undefined/null values (the key logic)
    Object.keys(insightsParams).forEach(key => {
      if (insightsParams[key] === undefined || insightsParams[key] === null) {
        console.log(`🗑️  Removing ${key}: ${insightsParams[key]}`);
        delete insightsParams[key];
      } else if (Array.isArray(insightsParams[key])) {
        insightsParams[key] = insightsParams[key].join(',');
      }
    });

    console.log('Final params sent to Facebook API:', JSON.stringify(insightsParams, null, 2));
    
  } catch (error) {
    console.log('❌ Validation FAILED:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
});
