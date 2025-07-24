// Test the ACTUAL existing detectBreakdownFields function

// Real Facebook API responses
const realFacebookResponses = [
  // Multi-dimensional: age + gender + date
  {
    "data": [
      {
        "impressions": "4314",
        "spend": "123.45", 
        "clicks": "234",
        "date_start": "2024-12-01",
        "date_stop": "2024-12-01",
        "age": "25-34",
        "gender": "male"
      }
    ]
  },
  
  // Placement breakdown
  {
    "data": [
      {
        "impressions": "5000",
        "spend": "150.00",
        "clicks": "250",
        "publisher_platform": "facebook",
        "platform_position": "feed"
      }
    ]
  },
  
  // Age only
  {
    "data": [
      {
        "age": "18-24",
        "impressions": "78505",
        "spend": "234.56",
        "clicks": "892"
      }
    ]
  },
  
  // Simple insights (no breakdowns)
  {
    "data": [
      {
        "impressions": "10000",
        "spend": "300.00", 
        "clicks": "500"
      }
    ]
  }
];

// ACTUAL existing function from the codebase
function detectBreakdownFields(insightsData) {
  if (!insightsData || insightsData.length === 0) return [];
  
  const firstRow = insightsData[0];
  const potentialBreakdownFields = [
    'date_start', 'date_stop', 'placement', 'age', 'gender', 'country', 'region',
    'device_platform', 'publisher_platform', 'platform_position', 'impression_device',
    'product_id', 'dma'
  ];
  
  return potentialBreakdownFields.filter(field => firstRow.hasOwnProperty(field));
}

// Test each case
console.log('🧪 Testing ACTUAL existing detectBreakdownFields function\\n');

realFacebookResponses.forEach((response, index) => {
  const testNames = [
    'Multi-dimensional (age + gender + date)',
    'Placement breakdown (publisher_platform + platform_position)', 
    'Age only breakdown',
    'Simple insights (no breakdowns)'
  ];
  
  console.log(`=== ${testNames[index]} ===`);
  console.log('Data fields:', Object.keys(response.data[0]));
  
  const detected = detectBreakdownFields(response.data);
  console.log('Detected breakdowns:', detected);
  
  // Validate results
  const expected = [
    ['date_start', 'date_stop', 'age', 'gender'],  // Multi-dimensional
    ['publisher_platform', 'platform_position'],   // Placement  
    ['age'],                                        // Age only
    []                                              // No breakdowns
  ][index];
  
  const isCorrect = JSON.stringify(detected.sort()) === JSON.stringify(expected.sort());
  console.log('Expected:', expected);
  console.log('Correct?', isCorrect ? '✅' : '❌');
  
  if (!isCorrect) {
    console.log('❌ Missing:', expected.filter(f => !detected.includes(f)));
    console.log('❌ Extra:', detected.filter(f => !expected.includes(f)));
  }
  
  console.log('');
});

// Test the proposed solution logic
console.log('\\n🚀 Testing Proposed Solution Logic\\n');

function formatInsightsWithBreakdowns(insightsData) {
  const breakdownFields = detectBreakdownFields(insightsData);
  
  console.log(`Breakdown fields: [${breakdownFields.join(', ')}]`);
  
  if (breakdownFields.length === 0) {
    console.log('→ Using formatSimpleInsights()');
    return 'Simple insights';
  }
  
  if (breakdownFields.includes('date_start')) {
    console.log('→ Using formatTimeBasedBreakdown() - MULTI-DIMENSIONAL');
    return 'Time-based multi-dimensional breakdown';
  } else {
    console.log('→ Using formatGenericBreakdown() - SINGLE DIMENSION'); 
    return 'Generic breakdown';
  }
}

realFacebookResponses.forEach((response, index) => {
  const testNames = [
    'Multi-dimensional test',
    'Placement test',
    'Age test', 
    'Simple test'
  ];
  
  console.log(`--- ${testNames[index]} ---`);
  const result = formatInsightsWithBreakdowns(response.data);
  console.log(`Result: ${result}\\n`);
});

console.log('✅ Testing completed!');