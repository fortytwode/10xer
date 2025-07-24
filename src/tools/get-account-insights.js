import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';


export async function getAccountInsights(args) {
  try {
    // Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.accountInsights, args);
    const { act_id, fields, level, ...otherParams } = validatedArgs;

    const client = new FacebookAPIClient();
    
    // Step 1: Query Performance Data + Configuration
    // Automatically include 'conversions' when 'actions' is requested for better conversion tracking
    let enhancedFields = [...fields];
    
    // Log to both stderr and return in response for debugging
    const debugInfo = {
      originalFields: fields,
      includesActions: fields.includes('actions'),
      includesConversions: fields.includes('conversions'),
      willEnhance: fields.includes('actions') && !fields.includes('conversions')
    };
    
    if (fields.includes('actions') && !fields.includes('conversions')) {
      enhancedFields.push('conversions');
      debugInfo.addedConversions = true;
      debugInfo.enhancedFields = enhancedFields;
    }
    
    // Use parameters as provided - user must explicitly specify time_increment for daily breakdown
    let finalParams = { ...otherParams };

    const insightsParams = {
      fields: enhancedFields.join(','),
      level: level || 'account', // Default to account level
      ...finalParams,
    };

    // Remove undefined/null values and format arrays
    Object.keys(insightsParams).forEach(key => {
      if (insightsParams[key] === undefined || insightsParams[key] === null) {
        delete insightsParams[key];
      } else if (Array.isArray(insightsParams[key])) {
        insightsParams[key] = insightsParams[key].join(',');
      }
    });

    // Get performance data
    const insightsData = await client.makeRequest(`/${act_id}/insights`, insightsParams);

    // Format response with universal event detection
    let responseText = '';
    
    if (insightsData.data && insightsData.data.length > 0) {
      responseText += formatInsightsWithBreakdowns(
        insightsData.data, 
        level || 'account',
        validatedArgs
      );
      
      responseText += `\n\n**Debug Info:**\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``;
      responseText += `\n\n**Raw API Response:**\n\`\`\`json\n${JSON.stringify(insightsData, null, 2)}\n\`\`\``;
    } else {
      responseText = `No insights data found.\n\n**Debug Info:**\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``;
      responseText += `\n\n**Raw API Response:**\n\`\`\`json\n${JSON.stringify(insightsData, null, 2)}\n\`\`\``;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return createErrorResponse(error);
  }
}


function formatInsightsWithBreakdowns(insightsData, level, requestParams) {
  let responseText = '';
  
  // Detect breakdown dimensions from the data
  const breakdownFields = detectBreakdownFields(insightsData);
  const hasBreakdowns = breakdownFields.length > 0;
  
  if (hasBreakdowns) {
    responseText += `📊 **Performance Data with Breakdowns:**\n\n`;
    responseText += `🔍 **Breakdown Dimensions:** ${breakdownFields.join(', ')}\n\n`;
    
    // Show breakdown data - prioritize time-based multi-dimensional display
    if (breakdownFields.includes('date_start')) {
      responseText += formatTimeBasedBreakdown(insightsData, breakdownFields);
    } else {
      // Any other single dimension breakdown
      responseText += formatGenericBreakdown(insightsData, breakdownFields);
    }
    
  } else {
    // No breakdowns - use original event detection logic
    responseText += formatSimpleInsights(insightsData);
  }
  
  return responseText;
}

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

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = item[key];
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {});
}

function formatTimeBasedBreakdown(data, breakdownFields) {
  const nonTimeFields = breakdownFields.filter(f => !['date_start', 'date_stop'].includes(f));
  
  if (nonTimeFields.length === 0) {
    // Pure daily breakdown - use existing function
    return formatDailyBreakdown(data);
  }
  
  // Multi-dimensional with time - group by date, then show other dimensions
  const dateGroups = groupBy(data, 'date_start');
  let responseText = `📅 **Daily Performance`;
  
  if (nonTimeFields.length > 0) {
    responseText += ` by ${nonTimeFields.join(' × ')}`;
  }
  responseText += `:**\n\n`;
  
  Object.keys(dateGroups).sort().forEach(date => {
    const dayData = dateGroups[date];
    const dateEnd = dayData[0]?.date_stop;
    
    // Show date header
    if (date === dateEnd) {
      responseText += `**${date}:**\n`;
    } else {
      responseText += `**${date} to ${dateEnd}:**\n`;
    }
    
    // Show each row with its breakdown dimensions
    dayData.forEach(row => {
      const dimensions = nonTimeFields
        .map(field => `${field}: ${row[field]}`)
        .join(', ');
      
      responseText += `  ${dimensions} - `;
      responseText += formatRowMetrics(row, '').replace(/\n/g, ', ').trim().replace(/,$/, '') + '\n';
      
      // Show conversion summary for this row
      const conversionSummary = getConversionSummary([row]);
      if (conversionSummary) {
        responseText += `    🎯 Conversions: ${conversionSummary}\n`;
      }
    });
    responseText += '\n';
  });
  
  return responseText;
}

function formatDailyBreakdown(insightsData) {
  let responseText = `📅 **Daily Performance Breakdown:**\n\n`;
  
  // Group by date
  const dailyData = insightsData.reduce((acc, row) => {
    const date = row.date_start;
    if (!acc[date]) acc[date] = [];
    acc[date].push(row);
    return acc;
  }, {});
  
  // Sort dates
  const sortedDates = Object.keys(dailyData).sort();
  
  // Check if we have actual daily data or aggregated data
  const hasMultipleDates = sortedDates.length > 1;
  const firstRowDateRange = insightsData[0]?.date_start === insightsData[0]?.date_stop;
  
  if (!hasMultipleDates && !firstRowDateRange) {
    responseText += `⚠️ **Note:** Data appears to be aggregated over the entire date range rather than broken down daily.\n`;
    responseText += `To get daily breakdowns, ensure time_increment=1 is included in your request.\n\n`;
  }
  
  sortedDates.forEach(date => {
    const dayData = dailyData[date];
    const dateEnd = dayData[0]?.date_stop;
    
    if (date === dateEnd) {
      responseText += `**${date}:**\n`;
    } else {
      responseText += `**${date} to ${dateEnd}:**\n`;
    }
    
    // Aggregate metrics for this date group if multiple rows
    if (dayData.length > 1) {
      const aggregated = aggregateMetrics(dayData);
      responseText += formatRowMetrics(aggregated, '  ');
      
      // Show conversion summary
      const conversionSummary = getConversionSummary(dayData);
      if (conversionSummary) {
        responseText += `  🎯 **Conversions:** ${conversionSummary}\n`;
      }
    } else {
      responseText += formatRowMetrics(dayData[0], '  ');
      
      // Show conversion summary
      const conversionSummary = getConversionSummary(dayData);
      if (conversionSummary) {
        responseText += `  🎯 **Conversions:** ${conversionSummary}\n`;
      }
    }
    responseText += `\n`;
  });
  
  return responseText;
}

function formatPlacementBreakdown(insightsData) {
  let responseText = `📱 **Placement Performance Breakdown:**\n\n`;
  
  // Group by placement
  const placementData = insightsData.reduce((acc, row) => {
    const placement = row.placement || 'Unknown';
    if (!acc[placement]) acc[placement] = [];
    acc[placement].push(row);
    return acc;
  }, {});
  
  // Sort by spend (descending)
  const sortedPlacements = Object.keys(placementData).sort((a, b) => {
    const spendA = placementData[a].reduce((sum, row) => sum + parseFloat(row.spend || 0), 0);
    const spendB = placementData[b].reduce((sum, row) => sum + parseFloat(row.spend || 0), 0);
    return spendB - spendA;
  });
  
  sortedPlacements.forEach(placement => {
    const placementRows = placementData[placement];
    responseText += `**${placement}:**\n`;
    
    // Aggregate metrics for this placement
    const aggregated = aggregateMetrics(placementRows);
    responseText += formatRowMetrics(aggregated, '  ');
    
    // Show conversion events if available
    const conversionSummary = getConversionSummary(placementRows);
    if (conversionSummary) {
      responseText += `  🎯 **Conversions:** ${conversionSummary}\n`;
    }
    
    responseText += `\n`;
  });
  
  return responseText;
}

function formatDemographicBreakdown(insightsData) {
  let responseText = `👥 **Demographic Performance Breakdown:**\n\n`;
  
  // Group by age and/or gender
  const demoData = insightsData.reduce((acc, row) => {
    const age = row.age || 'Unknown Age';
    const gender = row.gender || 'Unknown Gender';
    const key = `${age} - ${gender}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  
  // Sort by spend (descending)
  const sortedDemos = Object.keys(demoData).sort((a, b) => {
    const spendA = demoData[a].reduce((sum, row) => sum + parseFloat(row.spend || 0), 0);
    const spendB = demoData[b].reduce((sum, row) => sum + parseFloat(row.spend || 0), 0);
    return spendB - spendA;
  });
  
  sortedDemos.forEach(demo => {
    const demoRows = demoData[demo];
    responseText += `**${demo}:**\n`;
    
    // Aggregate metrics for this demographic
    const aggregated = aggregateMetrics(demoRows);
    responseText += formatRowMetrics(aggregated, '  ');
    
    // Show conversion events if available
    const conversionSummary = getConversionSummary(demoRows);
    if (conversionSummary) {
      responseText += `  🎯 **Conversions:** ${conversionSummary}\n`;
    }
    
    responseText += `\n`;
  });
  
  return responseText;
}

function formatGenericBreakdown(insightsData, breakdownFields) {
  let responseText = `📊 **Custom Breakdown Results:**\n\n`;
  
  insightsData.forEach((row, index) => {
    responseText += `**Row ${index + 1}:**\n`;
    
    // Show breakdown dimensions
    breakdownFields.forEach(field => {
      if (row[field] !== undefined) {
        responseText += `  ${field}: ${row[field]}\n`;
      }
    });
    
    // Show metrics
    responseText += formatRowMetrics(row, '  ');
    
    // Show conversion events if available
    const conversionSummary = getConversionSummary([row]);
    if (conversionSummary) {
      responseText += `  🎯 **Conversions:** ${conversionSummary}\n`;
    }
    
    responseText += `\n`;
  });
  
  return responseText;
}

function formatSimpleInsights(insightsData) {
  let responseText = '📊 **Account Performance:**\n\n';
  
  // Guard against empty data
  if (!insightsData || insightsData.length === 0) {
    return responseText + 'No data available.\n';
  }
  
  const data = insightsData[0];
  responseText += formatRowMetrics(data);
  
  // Show conversion events if available
  if (data && data.actions && Array.isArray(data.actions)) {
    responseText += '\n**Conversion Events:**\n';
    data.actions.forEach(action => {
      responseText += `• ${action.action_type}: ${action.value}\n`;
    });
  }
  
  return responseText;
}

function formatRowMetrics(row, indent = '') {
  let text = '';
  
  // Guard against null/undefined row
  if (!row) return text;
  
  // Core metrics with null safety
  if (row.spend != null) text += `${indent}💰 Spend: $${parseFloat(row.spend || 0).toFixed(2)}\n`;
  if (row.impressions != null) text += `${indent}👁️ Impressions: ${parseInt(row.impressions || 0).toLocaleString()}\n`;
  if (row.clicks != null) text += `${indent}🖱️ Clicks: ${parseInt(row.clicks || 0).toLocaleString()}\n`;
  if (row.ctr != null) text += `${indent}📊 CTR: ${parseFloat(row.ctr || 0).toFixed(2)}%\n`;
  if (row.cpc != null) text += `${indent}💸 CPC: $${parseFloat(row.cpc || 0).toFixed(2)}\n`;
  if (row.cpm != null) text += `${indent}📈 CPM: $${parseFloat(row.cpm || 0).toFixed(2)}\n`;
  
  return text;
}

function aggregateMetrics(rows) {
  const aggregated = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    actions: [],
    conversions: []
  };
  
  rows.forEach(row => {
    aggregated.spend += parseFloat(row.spend || 0);
    aggregated.impressions += parseInt(row.impressions || 0);
    aggregated.clicks += parseInt(row.clicks || 0);
    
    if (row.actions) {
      aggregated.actions = aggregated.actions.concat(row.actions);
    }
    if (row.conversions) {
      aggregated.conversions = aggregated.conversions.concat(row.conversions);
    }
  });
  
  // Calculate derived metrics
  if (aggregated.impressions > 0) {
    aggregated.ctr = (aggregated.clicks / aggregated.impressions * 100).toFixed(2);
    aggregated.cpm = (aggregated.spend / aggregated.impressions * 1000).toFixed(2);
  }
  if (aggregated.clicks > 0) {
    aggregated.cpc = (aggregated.spend / aggregated.clicks).toFixed(2);
  }
  
  return aggregated;
}

function getConversionSummary(rows) {
  const conversionCounts = {};
  
  rows.forEach(row => {
    // Process conversions (higher priority)
    if (row.conversions && Array.isArray(row.conversions)) {
      row.conversions.forEach(conv => {
        const type = conv.action_type;
        conversionCounts[type] = (conversionCounts[type] || 0) + parseFloat(conv.value || 0);
      });
    }
    
    // Process actions (fallback)
    if (row.actions && Array.isArray(row.actions)) {
      row.actions.forEach(action => {
        const type = action.action_type;
        // Only add if not already in conversions
        if (!conversionCounts[type]) {
          conversionCounts[type] = (conversionCounts[type] || 0) + parseFloat(action.value || 0);
        }
      });
    }
  });
  
  const conversionEntries = Object.entries(conversionCounts).filter(([type, count]) => count > 0);
  if (conversionEntries.length === 0) return null;
  
  return conversionEntries
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');
}