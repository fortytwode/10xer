# Facebook Ads API Capabilities Reference

Quick reference for what analysis and breakdowns are possible with the Facebook Ads MCP Server.

---

## 🔧 Available Tools

### **Primary Analysis Tool: `facebook_get_adaccount_insights`**

**Core Parameters:**
- `level`: account, campaign, adset, ad
- `breakdowns`: Dimensional analysis (age, gender, placement, etc.)
- `action_breakdowns`: Conversion event breakdowns
- `time_increment`: Daily (1), weekly (7), monthly ("monthly")
- `fields`: Metrics to retrieve (spend, actions, conversions, etc.)

### **Supporting Tools:**
- `facebook_get_ad_creatives`: Creative performance with thumbnails
- `facebook_list_ad_accounts`: Account discovery
- `facebook_get_account_details`: Account information

---

## 📊 Breakdown Capabilities Matrix

### ✅ **Supported Breakdown Dimensions**

| Dimension | Parameter Value | Description | Use Case |
|-----------|----------------|-------------|----------|
| **Demographics** | `["age"]` | Age group performance | Audience optimization |
| | `["gender"]` | Gender-based performance | Targeting refinement |
| | `["age", "gender"]` | Combined demo analysis | Detailed audience insights |
| **Geographic** | `["country"]` | Country-level performance | Geographic expansion |
| | `["region"]` | Regional breakdown | Local market analysis |
| | `["dma"]` | US designated market areas | US regional targeting |
| **Placement** | `["placement"]` | Feed, Stories, Reels, etc. | Creative optimization |
| | `["platform_position"]` | Specific placement positions | Placement strategy |
| | `["publisher_platform"]` | Facebook, Instagram, etc. | Platform allocation |
| **Device** | `["device_platform"]` | Mobile, desktop, tablet | Device optimization |
| | `["impression_device"]` | Device for impressions | Technical optimization |
| **Temporal** | `time_increment: 1` | Daily breakdown | Trend analysis |
| | `time_increment: 7` | Weekly breakdown | Weekly performance |
| | `time_increment: "monthly"` | Monthly breakdown | Long-term trends |

### ✅ **Supported Aggregation Levels**

| Level | What It Provides | Best For |
|-------|------------------|----------|
| `account` | Total account performance | Overall ROI analysis |
| `campaign` | Per-campaign breakdown | Campaign comparison |
| `adset` | Per-adset breakdown | Audience performance |
| `ad` | Individual ad performance | Creative optimization |

### ✅ **Conversion Tracking**

| Field | Priority | Contains |
|-------|----------|-----------|
| `conversions` | **High** | Higher-fidelity conversion events |
| `actions` | Medium | General actions and fallback conversions |
| `action_breakdowns: ["action_type"]` | - | Breakdown by conversion type |

**Auto-Enhancement**: When requesting `actions`, the system automatically includes `conversions` for complete tracking.

---

## 🎯 Common Analysis Patterns

### **Demographics Analysis**
```javascript
{
  "level": "campaign",
  "breakdowns": ["age", "gender"],
  "action_breakdowns": ["action_type"],
  "fields": ["spend", "actions", "conversions", "campaign_name"]
}
```
**Result**: Age/gender performance for each campaign with conversion tracking.

### **Placement Analysis**  
```javascript
{
  "level": "campaign",
  "breakdowns": ["placement"], 
  "action_breakdowns": ["action_type"],
  "fields": ["spend", "actions", "conversions", "campaign_name"]
}
```
**Result**: Feed vs Stories vs Reels performance per campaign with conversions.

### **Daily Trend Analysis**
```javascript
{
  "level": "account", // or campaign
  "time_increment": 1,
  "fields": ["spend", "actions", "conversions", "date_start", "date_stop"]
}
```
**Result**: True daily performance data (not estimates).

### **Multi-Dimensional Analysis**
```javascript
{
  "level": "ad",
  "breakdowns": ["age", "placement"],
  "action_breakdowns": ["action_type"], 
  "fields": ["spend", "actions", "conversions", "ad_name"]
}
```
**Result**: Age groups by placement for each ad with conversion data.

---

## 📈 Advanced Capabilities

### **Campaign Type Filtering**
- **No direct API filter**, but results can be filtered by campaign name patterns
- **Prospecting**: Names containing "Prospecting", "Interest", "Lookalike"
- **Retargeting**: Names containing "Retargeting", "RT", "Custom", "LAL"

### **Time Range Options**
- **Presets**: `last_7d`, `last_30d`, `last_90d`, `lifetime`
- **Custom**: `time_range: {since: "YYYY-MM-DD", until: "YYYY-MM-DD"}`
- **Increments**: Daily (1), Weekly (7), Monthly ("monthly")

### **Metric Combinations**
```javascript
"fields": [
  // Core metrics
  "spend", "impressions", "clicks", "ctr", "cpc", "cpm",
  // Conversions (auto-enhanced)
  "actions", "conversions", 
  // Cost efficiency
  "cost_per_action_type", "cost_per_conversion",
  // Identification
  "campaign_name", "adset_name", "ad_name",
  // Time tracking  
  "date_start", "date_stop"
]
```

---

## ⚠️ Important Limitations & Considerations

### **Data Availability**
- **Privacy Thresholds**: Small audience segments may be hidden
- **Attribution Delays**: Recent data (24-48 hours) may be incomplete  
- **Volume Requirements**: Some breakdowns need minimum spend/impressions

### **Breakdown Combinations**
- **Most combinations work**: age + placement, gender + device, etc.
- **Test combinations**: Try them rather than assuming incompatibility
- **Fallback strategy**: Use separate calls if combined breakdown fails

### **Performance Considerations**  
- **Large date ranges**: May require pagination
- **Multiple breakdowns**: Can result in many rows
- **Response formatting**: Complex breakdowns automatically organized

---

## 🔍 Diagnostic Checklist

### **When Data Appears Missing:**

1. **Check the raw API response** before assuming unavailable
2. **Try different aggregation levels** (campaign → adset → ad)
3. **Verify date ranges** aren't too recent or too historical
4. **Look in both `actions` and `conversions`** fields
5. **Check if breakdown dimensions appear** in response structure

### **Common Solutions:**

| Issue | Solution |
|-------|----------|
| No demographic data | Check privacy thresholds, try broader date range |
| No placement data | Verify automatic placements enabled |
| No daily data | Use `time_increment: 1` parameter |
| No conversion data | Verify both `actions` and `conversions` requested |
| Data seems estimated | Use actual breakdown parameters, not custom calculations |

---

## 🎯 Quick Reference

### **Most Comprehensive Analysis Call:**
```javascript
{
  "act_id": "act_589039875116261",
  "level": "campaign",
  "fields": ["spend", "actions", "conversions", "campaign_name", "impressions", "clicks"],
  "breakdowns": ["age", "gender", "placement"],
  "action_breakdowns": ["action_type"],
  "time_increment": 1,
  "date_preset": "last_30d"
}
```

### **Remember:**
- ✅ Facebook API is highly capable
- ✅ Most reasonable breakdowns are possible  
- ✅ Try the API before assuming limitations
- ✅ Use raw responses to verify data availability
- ✅ Combine multiple calls for comprehensive analysis

**The Facebook Ads MCP Server provides access to the full Facebook Ads API capabilities - use them!**