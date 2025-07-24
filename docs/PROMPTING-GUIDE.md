# Facebook Ads MCP Server - AI Prompting Guide

This guide helps AI assistants effectively use the Facebook Ads MCP Server tools to provide accurate, comprehensive analysis without making incorrect assumptions about API limitations.

---

## 🎯 Key Principle: Don't Assume API Limitations

**The Facebook Ads API is highly capable**. Most breakdown and analysis requests that seem reasonable are actually possible. When in doubt, try the API call rather than assuming it won't work.

---

## 📊 Comprehensive Breakdown Capabilities

### ✅ **What IS Possible**

#### **Demographics Analysis**
```javascript
// Get age/gender breakdown for ANY campaign type
{
  "act_id": "act_589039875116261",
  "fields": ["spend", "actions", "conversions", "campaign_name"],
  "level": "campaign",
  "breakdowns": ["age", "gender"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_30d"
}
```
**Result**: Age and gender performance for each individual campaign, including prospecting campaigns.

#### **Placement Analysis**
```javascript
// Get placement breakdown for ANY campaign type
{
  "act_id": "act_589039875116261", 
  "fields": ["spend", "actions", "conversions", "campaign_name"],
  "level": "campaign",
  "breakdowns": ["placement"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_30d"
}
```
**Result**: Feed, Stories, Reels performance for each individual campaign, including prospecting campaigns.

#### **Daily Performance Analysis**
```javascript
// Get TRUE daily breakdown (not estimated)
{
  "act_id": "act_589039875116261",
  "fields": ["spend", "actions", "conversions", "date_start", "date_stop"],
  "level": "campaign", // or "account", "adset", "ad"
  "time_increment": 1,
  "date_preset": "last_30d"
}
```
**Result**: Actual daily performance data, not aggregated estimates.

#### **Combined Breakdowns**
```javascript
// Multiple breakdowns simultaneously
{
  "act_id": "act_589039875116261",
  "fields": ["spend", "actions", "conversions", "campaign_name"],
  "level": "ad",
  "breakdowns": ["age", "placement"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_7d"
}
```
**Result**: Age groups by placement performance for each ad.

### ❌ **Common Incorrect Assumptions**

1. **"Prospecting campaigns don't have demographic data"** → FALSE
   - All campaigns report demographics if targeting allows

2. **"Daily data is only estimated splits"** → FALSE  
   - Use `time_increment: 1` for true daily breakdown

3. **"Placement data not available for custom audiences"** → FALSE
   - Placement data available regardless of targeting method

4. **"Can't get conversion breakdowns"** → FALSE
   - Use `action_breakdowns: ["action_type"]` for conversion breakdowns

---

## 🛠️ Tool Usage Patterns

### **Pattern 1: Campaign Type Analysis**

Instead of assuming limitations, filter results by campaign naming patterns:

```javascript
// Get all campaigns first
{
  "act_id": "act_589039875116261",
  "fields": ["spend", "actions", "conversions", "campaign_name"],
  "level": "campaign",
  "breakdowns": ["age", "gender"], // or ["placement"]
  "date_preset": "last_30d"
}

// Then filter in analysis:
// - Prospecting: campaigns containing "Prospecting", "Interest", etc.
// - Retargeting: campaigns containing "Retargeting", "RT", "LAL", etc.
```

### **Pattern 2: Multi-Dimensional Analysis**

```javascript
// Step 1: Get demographic breakdown
{
  "breakdowns": ["age", "gender"],
  "action_breakdowns": ["action_type"]
}

// Step 2: Get placement breakdown  
{
  "breakdowns": ["placement"],
  "action_breakdowns": ["action_type"]
}

// Step 3: Combine insights in analysis
```

### **Pattern 3: Time-Series Analysis**

```javascript
// Daily trends
{
  "time_increment": 1,
  "fields": ["spend", "actions", "conversions", "date_start"]
}

// Weekly trends
{
  "time_increment": 7,
  "fields": ["spend", "actions", "conversions", "date_start"]
}
```

---

## 🔍 Diagnostic Approach

### **When Analysis Seems Limited:**

1. **Check the actual API response** in the raw data
2. **Look for breakdown fields** in the response
3. **Verify if data exists but wasn't processed** in formatting
4. **Try different breakdown combinations** rather than assuming unavailable

### **Common Data Availability Issues:**

```javascript
// If no demographic data appears:
// 1. Check if campaigns have sufficient volume for privacy thresholds
// 2. Verify campaigns are actually running (not paused)
// 3. Check date range - very recent data may be delayed

// If no placement data appears:  
// 1. Check if automatic placements are enabled
// 2. Verify campaigns are using placement optimization
// 3. Look for placement data at ad level instead of campaign level
```

---

## 📋 Analysis Templates

### **Complete Campaign Performance Report**

```javascript
// Base performance
{
  "level": "campaign",
  "fields": ["spend", "actions", "conversions", "campaign_name", "impressions", "clicks"],
  "date_preset": "last_30d"
}

// Demographics
{
  "level": "campaign", 
  "fields": ["spend", "actions", "conversions", "campaign_name"],
  "breakdowns": ["age", "gender"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_30d"
}

// Placements
{
  "level": "campaign",
  "fields": ["spend", "actions", "conversions", "campaign_name"], 
  "breakdowns": ["placement"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_30d"
}

// Daily trends
{
  "level": "campaign",
  "fields": ["spend", "actions", "conversions", "campaign_name", "date_start"],
  "time_increment": 1,
  "date_preset": "last_30d"
}
```

### **Creative Performance Analysis**

```javascript
// Use facebook_get_ad_creatives tool for:
// - Top performing ad creatives with thumbnails
// - Performance correlation by visual elements
// - Creative type analysis (video vs image)

// Combined with insights:
{
  "level": "ad",
  "fields": ["spend", "actions", "conversions", "ad_name"],
  "breakdowns": ["placement"],
  "action_breakdowns": ["action_type"]
}
```

---

## ⚠️ Important Reminders

### **For AI Assistants:**

1. **Always try the API call first** before stating something is not possible
2. **Use the actual tool responses** to determine what data is available
3. **Look at the raw API response** when formatting seems limited
4. **Combine multiple breakdown calls** for comprehensive analysis
5. **Filter results programmatically** rather than assuming API limitations

### **Data Quality Notes:**

- **Privacy Thresholds**: Facebook may hide demographic data for small audiences
- **Attribution Windows**: Conversion data may vary by attribution setting
- **Reporting Delays**: Very recent data (last 24-48 hours) may be incomplete
- **Campaign Types**: All campaign types support the same breakdown capabilities

### **Troubleshooting Steps:**

1. Check if the issue is in data availability or response formatting
2. Try different aggregation levels (account → campaign → adset → ad)
3. Verify date ranges and attribution windows
4. Look for data in both `actions` and `conversions` fields
5. Check if breakdown dimensions appear in raw API response

---

## 🎯 Summary

**The Facebook Ads MCP Server is highly capable**. Most analysis requests are possible using the existing `facebook_get_adaccount_insights` tool with appropriate breakdown parameters. 

**When providing analysis:**
- ✅ Use actual API responses to determine data availability
- ✅ Try breakdown combinations before stating limitations  
- ✅ Provide actionable insights based on available data
- ❌ Don't assume API limitations without verification
- ❌ Don't state data is unavailable without checking the raw response

The goal is to provide comprehensive, accurate Facebook Ads analysis using the full capabilities of the underlying API.