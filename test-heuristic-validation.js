// Test the "if it looks like a metric" heuristic against REAL Facebook data

const realFacebookResponse = [
  {
    "impressions": "4314",        // String number - metric
    "spend": "123.45",           // String number - metric  
    "clicks": "234",             // String number - metric
    "date_start": "2024-12-01",  // String date - NOT a metric, but not a number
    "date_stop": "2024-12-01",   // String date - NOT a metric, but not a number
    "age": "25-34",              // String range - breakdown dimension
    "gender": "male",            // String text - breakdown dimension
    "account_id": "123456789",   // String number - NOT a metric!
    "campaign_name": "Holiday Campaign", // String text - NOT a metric!
    "ctr": "5.42",              // String number - metric
    "frequency": "1.23"         // String number - metric
  }
];

// Proposed heuristic function
function detectBreakdownFields(data) {
  if (!data || data.length === 0) return [];
  
  const firstRow = data[0];
  
  // Simple heuristic: If it looks like a metric, it's probably a metric
  const metricPatterns = /^(spend|impression|click|reach|frequency|cost|ctr|cpc|cpm|roas).*$/i;
  
  return Object.keys(firstRow).filter(field => {
    const value = firstRow[field];
    
    // If it's a number (string or actual), probably a metric
    if (!isNaN(parseFloat(value))) return false;
    
    // If it matches metric patterns, probably a metric  
    if (metricPatterns.test(field)) return false;
    
    // Everything else is probably a breakdown dimension
    return true;
  });
}

// Test the heuristic
console.log('🧪 Testing "if it looks like a metric" heuristic\\n');

const detectedBreakdowns = detectBreakdownFields(realFacebookResponse);
console.log('Detected breakdown fields:', detectedBreakdowns);

console.log('\\n📊 Analysis of each field:');
Object.entries(realFacebookResponse[0]).forEach(([field, value]) => {
  const isNumber = !isNaN(parseFloat(value));
  const matchesPattern = /^(spend|impression|click|reach|frequency|cost|ctr|cpc|cpm|roas).*$/i.test(field);
  const isDetectedAsBreakdown = detectedBreakdowns.includes(field);
  const shouldBeBreakdown = ['age', 'gender'].includes(field);
  const shouldBeMetric = ['impressions', 'spend', 'clicks', 'ctr', 'frequency'].includes(field);
  const shouldBeIgnored = ['date_start', 'date_stop', 'account_id', 'campaign_name'].includes(field);
  
  console.log(`${field}: "${value}"`);
  console.log(`  Is number: ${isNumber}`);
  console.log(`  Matches pattern: ${matchesPattern}`);
  console.log(`  Detected as breakdown: ${isDetectedAsBreakdown}`);
  console.log(`  Should be breakdown: ${shouldBeBreakdown}`);
  console.log(`  Should be metric: ${shouldBeMetric}`);
  console.log(`  Should be ignored: ${shouldBeIgnored}`);
  
  // Check for errors
  if (shouldBeBreakdown && !isDetectedAsBreakdown) {
    console.log(`  ❌ ERROR: Should be breakdown but not detected!`);
  }
  if (shouldBeMetric && isDetectedAsBreakdown) {
    console.log(`  ❌ ERROR: Should be metric but detected as breakdown!`);
  }
  if (shouldBeIgnored && isDetectedAsBreakdown) {
    console.log(`  ❌ ERROR: Should be ignored but detected as breakdown!`);
  }
  
  console.log('');
});

// Test with problematic cases
console.log('\\n🚨 Testing problematic edge cases:\\n');

const problematicCases = [
  {
    "campaign_id": "123456789",    // Numeric ID - not a metric!
    "ad_name": "Test Ad 1",        // Text - not a breakdown!
    "placement": "feed",           // Text - IS a breakdown
    "cost_per_result": "2.45",     // Numeric metric
    "result_rate": "12.34",        // Numeric metric  
    "video_play_actions": "567"    // Numeric metric
  }
];

const problematicBreakdowns = detectBreakdownFields(problematicCases);
console.log('Problematic case detected breakdowns:', problematicBreakdowns);

console.log('\\n🎯 What should actually be breakdown dimensions:');
console.log('- placement (IS detected)');
console.log('- Nothing else in this case');

console.log('\\n❌ What\'s wrongly detected:');
problematicBreakdowns.forEach(field => {
  if (field !== 'placement') {
    console.log(`- ${field} (should NOT be breakdown)`);
  }
});

console.log('\\n✅ Summary of heuristic accuracy...');