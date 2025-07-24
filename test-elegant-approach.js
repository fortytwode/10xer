// Lightweight test for elegant breakdown approach
// This simulates the logic without touching the main codebase

// Mock Facebook API response data
const mockDailyData = [
  { date_start: '2024-12-01', date_stop: '2024-12-01', spend: '100', impressions: '1000', clicks: '50' },
  { date_start: '2024-12-02', date_stop: '2024-12-02', spend: '120', impressions: '1200', clicks: '60' },
  { date_start: '2024-12-03', date_stop: '2024-12-03', spend: '90', impressions: '900', clicks: '45' },
  { date_start: '2024-12-04', date_stop: '2024-12-04', spend: '110', impressions: '1100', clicks: '55' },
  { date_start: '2024-12-05', date_stop: '2024-12-05', spend: '130', impressions: '1300', clicks: '65' },
  { date_start: '2024-12-06', date_stop: '2024-12-06', spend: '95', impressions: '950', clicks: '48' },
  { date_start: '2024-12-07', date_stop: '2024-12-07', spend: '105', impressions: '1050', clicks: '52' }
];

const mockPlacementData = [
  { placement: 'feed', spend: '300', impressions: '3000', clicks: '150' },
  { placement: 'stories', spend: '200', impressions: '2000', clicks: '100' },
  { placement: 'reels', spend: '150', impressions: '1500', clicks: '75' }
];

const mockDemographicData = [
  { age: '25-34', gender: 'male', spend: '200', impressions: '2000', clicks: '100' },
  { age: '25-34', gender: 'female', spend: '180', impressions: '1800', clicks: '90' },
  { age: '35-44', gender: 'male', spend: '150', impressions: '1500', clicks: '75' }
];

// Test functions
function detectBreakdownFields(data) {
  if (!data || data.length === 0) return [];
  const firstRow = data[0];
  const standardFields = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'actions', 'conversions'];
  return Object.keys(firstRow).filter(field => !standardFields.includes(field));
}

function detectTimePeriod(dailyData) {
  const dates = dailyData.map(d => d.date_start).sort();
  const daysDiff = Math.floor((new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]} (${daysDiff} days)`);
  
  if (daysDiff <= 14) return 'daily';
  if (daysDiff <= 90) return 'weekly';
  if (daysDiff <= 365) return 'monthly';
  return 'quarterly';
}

function aggregateToWeekly(dailyData) {
  const weeklyData = {};
  
  dailyData.forEach(row => {
    const date = new Date(row.date_start);
    const weekStart = getWeekStart(date);
    
    if (!weeklyData[weekStart]) {
      weeklyData[weekStart] = { spend: 0, impressions: 0, clicks: 0, date_start: weekStart };
    }
    
    weeklyData[weekStart].spend += parseFloat(row.spend);
    weeklyData[weekStart].impressions += parseInt(row.impressions);
    weeklyData[weekStart].clicks += parseInt(row.clicks);
  });
  
  return Object.values(weeklyData);
}

function getWeekStart(date) {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
}

function formatTimeBreakdown(data) {
  const period = detectTimePeriod(data);
  console.log(`🎯 Detected time period: ${period}`);
  
  if (period === 'weekly') {
    const weeklyData = aggregateToWeekly(data);
    console.log('📊 Weekly aggregated data:');
    weeklyData.forEach(week => {
      console.log(`  Week of ${week.date_start}: $${week.spend} spend, ${week.impressions} impressions`);
    });
    return `Weekly breakdown (${weeklyData.length} weeks)`;
  } else {
    console.log('📊 Daily data:');
    data.forEach(day => {
      console.log(`  ${day.date_start}: $${day.spend} spend, ${day.impressions} impressions`);
    });
    return `Daily breakdown (${data.length} days)`;
  }
}

function formatGenericBreakdown(data, breakdownFields) {
  console.log(`🔍 Generic breakdown for fields: ${breakdownFields.join(', ')}`);
  data.forEach((row, i) => {
    const breakdownValues = breakdownFields.map(field => `${field}: ${row[field]}`).join(', ');
    console.log(`  Row ${i + 1}: ${breakdownValues} - $${row.spend} spend`);
  });
  return `Generic breakdown (${data.length} rows)`;
}

function formatSimpleInsights(data) {
  const row = data[0];
  console.log(`📊 Simple insights: $${row.spend} spend, ${row.impressions} impressions`);
  return 'Simple insights';
}

// Main elegant function
function formatInsightsWithBreakdowns(data) {
  console.log('\\n🧪 Testing elegant approach...');
  
  const breakdownFields = detectBreakdownFields(data);
  console.log(`🔍 Detected breakdown fields: [${breakdownFields.join(', ')}]`);
  
  if (breakdownFields.includes('date_start')) {
    return formatTimeBreakdown(data);
  } else if (breakdownFields.length > 0) {
    return formatGenericBreakdown(data, breakdownFields);
  } else {
    return formatSimpleInsights(data);
  }
}

// Run tests
console.log('🚀 Testing Elegant Breakdown Approach\\n');

console.log('=== Test 1: Daily Data (7 days) ===');
formatInsightsWithBreakdowns(mockDailyData);

console.log('\\n=== Test 2: Placement Data ===');
formatInsightsWithBreakdowns(mockPlacementData);

console.log('\\n=== Test 3: Demographic Data ===');
formatInsightsWithBreakdowns(mockDemographicData);

console.log('\\n=== Test 4: Simple Data (no breakdowns) ===');
formatInsightsWithBreakdowns([{ spend: '500', impressions: '5000', clicks: '250' }]);

// Test with longer date range to trigger weekly
const longDailyData = [];
for (let i = 0; i < 30; i++) {
  const date = new Date('2024-11-01');
  date.setDate(date.getDate() + i);
  longDailyData.push({
    date_start: date.toISOString().split('T')[0],
    date_stop: date.toISOString().split('T')[0],
    spend: (100 + Math.random() * 50).toFixed(0),
    impressions: (1000 + Math.random() * 500).toFixed(0),
    clicks: (50 + Math.random() * 25).toFixed(0)
  });
}

console.log('\\n=== Test 5: Long Date Range (30 days - should trigger weekly) ===');
formatInsightsWithBreakdowns(longDailyData);

console.log('\\n✅ All tests completed!');