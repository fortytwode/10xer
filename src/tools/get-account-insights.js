// src/facebook/getAccountInsights.js
import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';

export async function getAccountInsights(args, accessToken) {
  try {
    // ✅ Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.accountInsights, args);
    const {
      act_id,
      fields,
      level,
      period,
      time_increment,
      time_range,
      ...otherParams
    } = validatedArgs;

    const client = new FacebookAPIClient(accessToken);

    // ✅ Automatically include "conversions" when "actions" is requested
    let enhancedFields = [...fields];
    const debugInfo = {
      originalFields: fields,
      includesActions: fields.includes('actions'),
      includesConversions: fields.includes('conversions'),
      addedConversions: false,
    };

    if (fields.includes('actions') && !fields.includes('conversions')) {
      enhancedFields.push('conversions');
      debugInfo.addedConversions = true;
    }

    // ✅ Determine proper time increment
    let finalTimeIncrement = time_increment ?? 'monthly';
    if (!finalTimeIncrement && period === 'month') {
      finalTimeIncrement = 'monthly';
    }

    // ✅ Build insights request parameters
    const insightsParams = {
      fields: enhancedFields.join(','),
      level: level || 'account',
      time_increment: finalTimeIncrement || undefined,
      ...otherParams,
    };

    if (time_range) {
      insightsParams.time_range = JSON.stringify(time_range);
    }

    // ✅ Clean up null/undefined and arrays
    Object.keys(insightsParams).forEach((key) => {
      if (insightsParams[key] === undefined || insightsParams[key] === null) {
        delete insightsParams[key];
      } else if (Array.isArray(insightsParams[key])) {
        insightsParams[key] = insightsParams[key].join(',');
      }
    });

    // ✅ Fetch performance data
    const insightsData = await client.makeRequest(`/${act_id}/insights`, insightsParams);

    // ✅ Format final output
    let responseText = '';

    if (insightsData.data && insightsData.data.length > 0) {
      if (finalTimeIncrement === 'monthly') {
        responseText += formatMonthlyBreakdown(insightsData.data);
      } else {
        responseText += formatInsightsWithBreakdowns(
          insightsData.data,
          level || 'account',
          validatedArgs
        );
      }

      responseText += `\n\n**Debug Info:**\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``;
      responseText += `\n\n**Raw API Response:**\n\`\`\`json\n${JSON.stringify(insightsData, null, 2)}\n\`\`\``;
    } else {
      responseText = `No insights data found.\n\n**Debug Info:**\n\`\`\`json\n${JSON.stringify(
        debugInfo,
        null,
        2
      )}\n\`\`\``;
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

/* -------------------------------------------------------------------------- */
/* 📅 MONTHLY BREAKDOWN SUPPORT */
/* -------------------------------------------------------------------------- */

function formatMonthlyBreakdown(insightsData) {
  let responseText = `📆 **Month-wise Performance Breakdown:**\n\n`;

  // Sort data by month
  const sortedData = [...insightsData].sort((a, b) =>
    a.date_start.localeCompare(b.date_start)
  );

  sortedData.forEach((row) => {
    const start = row.date_start;
    const end = row.date_stop;
    const label =
      start.slice(0, 7) === end.slice(0, 7)
        ? `${start.slice(0, 7)}`
        : `${start.slice(0, 7)} → ${end.slice(0, 7)}`;

    responseText += `**${label}:**\n`;
    responseText += formatRowMetrics(row, '  ');

    const conversions = getConversionSummary([row]);
    if (conversions) {
      responseText += `  🎯 **Conversions:** ${conversions}\n`;
    }
    responseText += '\n';
  });

  return responseText;
}

/* -------------------------------------------------------------------------- */
/* 🔍 EXISTING HELPER FUNCTIONS (UNMODIFIED OR SLIGHTLY IMPROVED) */
/* -------------------------------------------------------------------------- */

function formatInsightsWithBreakdowns(insightsData, level, requestParams) {
  const breakdownFields = detectBreakdownFields(insightsData);
  if (breakdownFields.includes('date_start') && requestParams.time_increment === 'monthly') {
    return formatMonthlyBreakdown(insightsData);
  } else if (breakdownFields.includes('date_start')) {
    return formatTimeBasedBreakdown(insightsData, breakdownFields);
  } else {
    return formatSimpleInsights(insightsData);
  }
}

function formatTimeBasedBreakdown(insightsData, breakdownFields) {
  let responseText = `📅 **Time-Based Performance Breakdown:**\n\n`;

  // Sort by start date
  const sortedData = [...insightsData].sort((a, b) =>
    a.date_start.localeCompare(b.date_start)
  );

  sortedData.forEach((row) => {
    const start = row.date_start;
    const end = row.date_stop;
    const label =
      start === end
        ? `${start}`
        : `${start} → ${end}`;

    responseText += `**${label}:**\n`;
    responseText += formatRowMetrics(row, '  ');

    const conversions = getConversionSummary([row]);
    if (conversions) {
      responseText += `  🎯 **Conversions:** ${conversions}\n`;
    }
    responseText += '\n';
  });

  return responseText;
}


function detectBreakdownFields(insightsData) {
  if (!insightsData || insightsData.length === 0) return [];
  const firstRow = insightsData[0];
  const possible = [
    'date_start',
    'date_stop',
    'placement',
    'age',
    'gender',
    'country',
    'region',
    'device_platform',
    'publisher_platform',
    'platform_position',
    'impression_device',
    'product_id',
    'dma',
  ];
  return possible.filter((f) => f in firstRow);
}

function formatRowMetrics(row, indent = '') {
  let text = '';
  if (!row) return text;
  if (row.spend != null) text += `${indent}💰 Spend: $${parseFloat(row.spend || 0).toFixed(2)}\n`;
  if (row.impressions != null)
    text += `${indent}👁️ Impressions: ${parseInt(row.impressions || 0).toLocaleString()}\n`;
  if (row.clicks != null)
    text += `${indent}🖱️ Clicks: ${parseInt(row.clicks || 0).toLocaleString()}\n`;
  if (row.ctr != null) text += `${indent}📊 CTR: ${parseFloat(row.ctr || 0).toFixed(2)}%\n`;
  if (row.cpc != null) text += `${indent}💸 CPC: $${parseFloat(row.cpc || 0).toFixed(2)}\n`;
  if (row.cpm != null) text += `${indent}📈 CPM: $${parseFloat(row.cpm || 0).toFixed(2)}\n`;
  return text;
}

function getConversionSummary(rows) {
  const conversions = {};
  rows.forEach((r) => {
    if (Array.isArray(r.conversions)) {
      r.conversions.forEach((c) => {
        conversions[c.action_type] = (conversions[c.action_type] || 0) + parseFloat(c.value || 0);
      });
    }
    if (Array.isArray(r.actions)) {
      r.actions.forEach((a) => {
        if (!conversions[a.action_type]) {
          conversions[a.action_type] = (conversions[a.action_type] || 0) + parseFloat(a.value || 0);
        }
      });
    }
  });
  const list = Object.entries(conversions)
    .filter(([t, v]) => v > 0)
    .map(([t, v]) => `${t}: ${v}`)
    .join(', ');
  return list || null;
}