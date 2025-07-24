// Test with REAL Facebook API response structures from documentation

// Real Facebook API response for age + gender breakdown
const realMultiBreakdownResponse = {
  "data": [
    {
      "impressions": "4314",
      "spend": "123.45", 
      "clicks": "234",
      "date_start": "2024-12-01",
      "date_stop": "2024-12-01",
      "age": "25-34",
      "gender": "male"
    },
    {
      "impressions": "3127",
      "spend": "89.12",
      "clicks": "178", 
      "date_start": "2024-12-01",
      "date_stop": "2024-12-01",
      "age": "25-34",
      "gender": "female"
    },
    {
      "impressions": "2890",
      "spend": "95.67",
      "clicks": "156",
      "date_start": "2024-12-02", 
      "date_stop": "2024-12-02",
      "age": "25-34",
      "gender": "male"
    },
    {
      "impressions": "2456",
      "spend": "78.34",
      "clicks": "134",
      "date_start": "2024-12-02",
      "date_stop": "2024-12-02", 
      "age": "35-44",
      "gender": "female"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MgZDZD"
    }
  }
};

// Real Facebook API response for single age breakdown
const realSingleBreakdownResponse = {
  "data": [
    {
      "age": "18-24",
      "date_start": "2024-12-01",
      "date_stop": "2024-12-07", 
      "impressions": "78505",
      "spend": "234.56",
      "clicks": "892"
    },
    {
      "age": "25-34", 
      "date_start": "2024-12-01",
      "date_stop": "2024-12-07",
      "impressions": "82575",
      "spend": "298.43",
      "clicks": "1034"
    }
  ]
};

// Test functions from our proposed solution
function detectBreakdownFields(data) {
  if (!data || data.length === 0) return [];
  const firstRow = data[0];
  const standardFields = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'actions', 'conversions'];
  return Object.keys(firstRow).filter(field => !standardFields.includes(field));
}

function detectBreakdownPattern(breakdownFields) {
  const hasTime = breakdownFields.includes('date_start');
  const nonTimeFields = breakdownFields.filter(f => !['date_start', 'date_stop'].includes(f));
  
  return {
    hasTime,
    nonTimeFields,
    pattern: hasTime ? 'time-based' : 'dimensional'
  };
}

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = item[key];
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {});
}

function formatRowMetrics(row, indent = '') {
  let text = '';
  if (row.spend != null) text += `$${parseFloat(row.spend || 0).toFixed(2)} spend`;
  if (row.impressions != null) text += `, ${parseInt(row.impressions || 0).toLocaleString()} impressions`;
  if (row.clicks != null) text += `, ${parseInt(row.clicks || 0).toLocaleString()} clicks`;
  return text;
}

function formatTimeBasedBreakdown(data, pattern) {
  if (pattern.nonTimeFields.length === 0) {
    return 'Pure daily breakdown (existing function)';
  }
  
  // Time + other dimensions
  const dateGroups = groupBy(data, 'date_start');
  let responseText = `📅 **Daily Performance`;
  
  if (pattern.nonTimeFields.length > 0) {
    responseText += ` by ${pattern.nonTimeFields.join(' × ')}`;
  }
  responseText += `:**\\n\\n`;
  
  Object.keys(dateGroups).sort().forEach(date => {
    responseText += `**${date}:**\\n`;
    
    const dayData = dateGroups[date];
    dayData.forEach(row => {
      // Show all non-time dimensions
      const dimensions = pattern.nonTimeFields
        .map(field => `${field}: ${row[field]}`)
        .join(', ');
      
      responseText += `  ${dimensions} - ${formatRowMetrics(row)}\\n`;
    });
    responseText += '\\n';
  });
  
  return responseText;
}

function formatDimensionalBreakdown(data, dimensionFields) {
  let responseText = `📊 **Performance by ${dimensionFields.join(' × ')}:**\\n\\n`;
  
  data.forEach((row, index) => {
    const dimensions = dimensionFields
      .map(field => `${field}: ${row[field]}`)
      .join(', ');
    
    responseText += `**${dimensions}:**\\n`;
    responseText += `  ${formatRowMetrics(row)}\\n\\n`;
  });
  
  return responseText;
}

function formatInsightsWithBreakdowns(insightsData, testName) {
  console.log(`\\n=== ${testName} ===`);
  
  const breakdownFields = detectBreakdownFields(insightsData);
  console.log(`🔍 Detected breakdown fields: [${breakdownFields.join(', ')}]`);
  
  if (breakdownFields.length === 0) {
    console.log('✅ No breakdowns - using simple insights');
    return 'Simple insights';
  }
  
  const pattern = detectBreakdownPattern(breakdownFields);
  console.log(`📊 Pattern: ${pattern.pattern}, hasTime: ${pattern.hasTime}, nonTimeFields: [${pattern.nonTimeFields.join(', ')}]`);
  
  if (pattern.hasTime) {
    const result = formatTimeBasedBreakdown(insightsData, pattern);
    console.log(result);
    return result;
  } else {
    const result = formatDimensionalBreakdown(insightsData, pattern.nonTimeFields);
    console.log(result);
    return result;
  }
}

// Run tests with REAL Facebook API response structures
console.log('🚀 Testing with REAL Facebook API Response Structures\\n');

// Test 1: Multi-dimensional with time (age + gender + date)
formatInsightsWithBreakdowns(
  realMultiBreakdownResponse.data, 
  'Real Multi-Breakdown (Age + Gender + Date)'
);

// Test 2: Single breakdown without time (age only, aggregated over week)
formatInsightsWithBreakdowns(
  realSingleBreakdownResponse.data,
  'Real Single Breakdown (Age only, aggregated)'
);

// Test 3: Edge case - what if Facebook returns unexpected structure?
const edgeCaseResponse = [
  {
    "placement": "feed",
    "impressions": "1000",
    "spend": "50.00",
    // Missing date_start - Facebook aggregated over entire period
  },
  {
    "placement": "stories", 
    "impressions": "800",
    "spend": "40.00"
  }
];

formatInsightsWithBreakdowns(edgeCaseResponse, 'Edge Case (No date fields)');

// Test 4: Real placement + date combination (what user actually wants)
const placementPlusDateResponse = [
  {
    "date_start": "2024-12-01",
    "date_stop": "2024-12-01", 
    "publisher_platform": "facebook",
    "platform_position": "feed",
    "impressions": "5000",
    "spend": "150.00",
    "clicks": "250"
  },
  {
    "date_start": "2024-12-01",
    "date_stop": "2024-12-01",
    "publisher_platform": "facebook", 
    "platform_position": "story",
    "impressions": "3000",
    "spend": "90.00", 
    "clicks": "120"
  },
  {
    "date_start": "2024-12-02",
    "date_stop": "2024-12-02",
    "publisher_platform": "facebook",
    "platform_position": "feed", 
    "impressions": "5200",
    "spend": "156.00",
    "clicks": "260"
  }
];

formatInsightsWithBreakdowns(placementPlusDateResponse, 'Real Placement + Date (User Request)');

console.log('\\n✅ Real Facebook API structure tests completed!');