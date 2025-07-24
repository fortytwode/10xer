// Test double breakdowns specifically
// Mock data for combination breakdowns

const mockPlacementPlusDay = [
  { date_start: '2024-12-01', placement: 'feed', spend: '100', impressions: '1000', clicks: '50' },
  { date_start: '2024-12-01', placement: 'stories', spend: '80', impressions: '800', clicks: '40' },
  { date_start: '2024-12-02', placement: 'feed', spend: '120', impressions: '1200', clicks: '60' },
  { date_start: '2024-12-02', placement: 'stories', spend: '90', impressions: '900', clicks: '45' },
  { date_start: '2024-12-02', placement: 'reels', spend: '70', impressions: '700', clicks: '35' }
];

const mockGenderPlusDay = [
  { date_start: '2024-12-01', gender: 'male', spend: '150', impressions: '1500', clicks: '75' },
  { date_start: '2024-12-01', gender: 'female', spend: '130', impressions: '1300', clicks: '65' },
  { date_start: '2024-12-02', gender: 'male', spend: '160', impressions: '1600', clicks: '80' },
  { date_start: '2024-12-02', gender: 'female', spend: '140', impressions: '1400', clicks: '70' }
];

const mockAgePlusDay = [
  { date_start: '2024-12-01', age: '25-34', spend: '120', impressions: '1200', clicks: '60' },
  { date_start: '2024-12-01', age: '35-44', spend: '100', impressions: '1000', clicks: '50' },
  { date_start: '2024-12-02', age: '25-34', spend: '130', impressions: '1300', clicks: '65' },
  { date_start: '2024-12-02', age: '35-44', spend: '110', impressions: '1100', clicks: '55' }
];

// Test functions (copied from previous test)
function detectBreakdownFields(data) {
  if (!data || data.length === 0) return [];
  const firstRow = data[0];
  const standardFields = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'actions', 'conversions'];
  return Object.keys(firstRow).filter(field => !standardFields.includes(field));
}

function formatTimeBreakdown(data) {
  console.log('📅 Time breakdown detected');
  data.forEach(row => {
    const otherFields = Object.keys(row).filter(k => !['date_start', 'spend', 'impressions', 'clicks'].includes(k));
    const extras = otherFields.length > 0 ? ` (${otherFields.map(f => `${f}: ${row[f]}`).join(', ')})` : '';
    console.log(`  ${row.date_start}: $${row.spend} spend${extras}`);
  });
  return 'Time breakdown';
}

function formatGenericBreakdown(data, breakdownFields) {
  console.log(`🔍 Generic breakdown for fields: ${breakdownFields.join(', ')}`);
  data.forEach((row, i) => {
    const breakdownValues = breakdownFields.map(field => `${field}: ${row[field]}`).join(', ');
    console.log(`  Row ${i + 1}: ${breakdownValues} - $${row.spend} spend`);
  });
  return 'Generic breakdown';
}

// Current elegant approach
function formatInsightsWithBreakdowns(data, testName) {
  console.log(`\\n=== ${testName} ===`);
  console.log('🧪 Testing elegant approach...');
  
  const breakdownFields = detectBreakdownFields(data);
  console.log(`🔍 Detected breakdown fields: [${breakdownFields.join(', ')}]`);
  
  if (breakdownFields.includes('date_start')) {
    console.log('✅ Date detected - using time breakdown');
    return formatTimeBreakdown(data);
  } else if (breakdownFields.length > 0) {
    console.log('✅ Non-date breakdown - using generic breakdown');
    return formatGenericBreakdown(data, breakdownFields);
  } else {
    console.log('✅ No breakdowns - using simple insights');
    return 'Simple insights';
  }
}

// Test matrix breakdown approach
function formatMatrixBreakdown(data, breakdownFields) {
  console.log(`🎯 Matrix breakdown approach for: ${breakdownFields.join(' × ')}`);
  
  if (breakdownFields.includes('date_start')) {
    const nonDateFields = breakdownFields.filter(f => f !== 'date_start');
    console.log(`📅 Date + ${nonDateFields.join(', ')} breakdown:`);
    
    // Group by date first, then by other dimensions
    const dateGroups = {};
    data.forEach(row => {
      const date = row.date_start;
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(row);
    });
    
    Object.keys(dateGroups).sort().forEach(date => {
      console.log(`  **${date}:**`);
      dateGroups[date].forEach(row => {
        const otherValues = nonDateFields.map(f => `${f}: ${row[f]}`).join(', ');
        console.log(`    ${otherValues} - $${row.spend} spend`);
      });
    });
  } else {
    console.log('📊 Multi-dimensional breakdown:');
    data.forEach((row, i) => {
      const values = breakdownFields.map(f => `${f}: ${row[f]}`).join(', ');
      console.log(`  ${values} - $${row.spend} spend`);
    });
  }
  
  return 'Matrix breakdown';
}

// Run tests
console.log('🚀 Testing Double Breakdowns\\n');

// Test current elegant approach
formatInsightsWithBreakdowns(mockPlacementPlusDay, 'Placement + Day (Current Approach)');
formatInsightsWithBreakdowns(mockGenderPlusDay, 'Gender + Day (Current Approach)');
formatInsightsWithBreakdowns(mockAgePlusDay, 'Age + Day (Current Approach)');

// Test matrix approach
console.log('\\n📊 Testing Matrix Breakdown Approach:');
console.log('\\n=== Placement + Day (Matrix) ===');
formatMatrixBreakdown(mockPlacementPlusDay, detectBreakdownFields(mockPlacementPlusDay));

console.log('\\n=== Gender + Day (Matrix) ===');
formatMatrixBreakdown(mockGenderPlusDay, detectBreakdownFields(mockGenderPlusDay));

console.log('\\n=== Age + Day (Matrix) ===');
formatMatrixBreakdown(mockAgePlusDay, detectBreakdownFields(mockAgePlusDay));

console.log('\\n✅ Double breakdown tests completed!');