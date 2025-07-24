# AppsFlyer Integration Plan

## 🎯 **Integration Overview**

Add AppsFlyer analytics to the MCP server to provide comprehensive mobile attribution and performance data alongside Facebook Ads data.

## 🏗️ **Architecture Design**

### **Multi-Client Account Management**
```javascript
// Environment variables per client
APPSFLYER_CLIENT_A_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
APPSFLYER_CLIENT_A_NAME=Client A Corp
APPSFLYER_CLIENT_A_APPS=com.clienta.app1,com.clienta.app2

APPSFLYER_CLIENT_B_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
APPSFLYER_CLIENT_B_NAME=Client B Inc
APPSFLYER_CLIENT_B_APPS=com.clientb.mainapp
```

### **API Structure**
- **Base URL**: `https://hq1.appsflyer.com/api`
- **Authentication**: `Authorization: Bearer {jwt_token}`
- **Rate Limits**: TBD (need to research specific limits)

## 📊 **Key Data Sources**

### **1. Attribution Data**
- **Installs Report**: `/raw-data/export/app/{app_id}/installs_report/v5`
- **Events Report**: `/raw-data/export/app/{app_id}/in_app_events_report/v5`
- **Uninstalls**: `/raw-data/export/app/{app_id}/uninstall_events_report/v5`

### **2. Aggregate Analytics**
- **Overview Report**: `/agg-data/export/app/{app_id}/overview_report/v5`
- **Partners Report**: `/agg-data/export/app/{app_id}/partners_report/v5`
- **Geo Report**: `/agg-data/export/app/{app_id}/geo_report/v5`

### **3. Revenue & LTV**
- **Revenue Events**: `/raw-data/export/app/{app_id}/ad_revenue_raw_data/v5`
- **Cohort Data**: `/agg-data/export/app/{app_id}/cohort_report/v5`

## 🛠️ **Implementation Files**

### **New Files to Create**
```
src/utils/appsflyer-api.js          # AppsFlyer API client
src/tools/appsflyer-auth.js         # Multi-client authentication
src/tools/appsflyer-installs.js     # Install attribution data
src/tools/appsflyer-events.js       # In-app events tracking
src/tools/appsflyer-revenue.js      # Revenue and LTV analytics
src/tools/appsflyer-cohorts.js      # Cohort analysis
src/tools/appsflyer-overview.js     # Campaign performance overview
```

### **Schema Additions**
```javascript
// Add to tool-schemas.js
appsflyer_check_auth: {
  type: 'object',
  properties: {
    client_id: { type: 'string', description: 'Client account identifier' }
  },
  required: ['client_id']
},

appsflyer_get_installs: {
  type: 'object', 
  properties: {
    client_id: { type: 'string' },
    app_id: { type: 'string' },
    date_range: {
      type: 'object',
      properties: {
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' }
      }
    },
    media_sources: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Filter by specific media sources/networks'
    }
  },
  required: ['client_id', 'app_id', 'date_range']
}
```

## 🔄 **Integration with Existing System**

### **Universal Server Updates**
Add AppsFlyer functions to all three protocols:
- **MCP**: Claude Desktop integration
- **OpenAI**: ChatGPT Custom GPT
- **Gemini**: AI Studio integration

### **Cross-Platform Analysis**
```javascript
// New combined analysis functions
facebook_appsflyer_attribution_analysis(fb_campaign_id, app_id, date_range)
facebook_appsflyer_roas_comparison(fb_account, af_client, date_range)
facebook_appsflyer_funnel_analysis(fb_ads, af_events, date_range)
```

## 📋 **New MCP Functions**

### **Authentication & Setup**
1. `appsflyer_list_clients()` - Show all configured client accounts
2. `appsflyer_check_auth(client_id)` - Verify token validity
3. `appsflyer_list_apps(client_id)` - Show apps for client

### **Attribution Data**
4. `appsflyer_get_installs(client_id, app_id, date_range, filters)`
5. `appsflyer_get_events(client_id, app_id, event_names, date_range)`
6. `appsflyer_get_attribution_data(client_id, app_id, date_range)`

### **Analytics & Reporting**
7. `appsflyer_get_overview(client_id, app_id, date_range, grouping)`
8. `appsflyer_get_cohort_report(client_id, app_id, cohort_type)`
9. `appsflyer_get_revenue_data(client_id, app_id, date_range)`

### **Performance Analysis**
10. `appsflyer_get_top_sources(client_id, app_id, date_range, metric)`
11. `appsflyer_compare_campaigns(client_id, app_id, campaign_ids)`
12. `appsflyer_get_ltv_analysis(client_id, app_id, cohort_period)`

### **Cross-Platform Integration**
13. `facebook_appsflyer_attribution_match(fb_campaign, app_id, date_range)`
14. `facebook_appsflyer_roas_analysis(fb_account, af_client, date_range)`

## 🧪 **Testing Strategy**

### **Phase 1: Single Client Setup**
1. Configure one client's API token
2. Test basic authentication
3. Verify data retrieval for installs/events

### **Phase 2: Multi-Client Support**
1. Add second client account
2. Test client switching
3. Verify data isolation

### **Phase 3: Cross-Platform Analysis**
1. Combine Facebook + AppsFlyer data
2. Test attribution matching
3. Validate ROAS calculations

## 🔐 **Security Considerations**

### **Token Management**
- Store JWT tokens securely (not in repository)
- Use environment variables for each client
- Implement token refresh if needed
- Log access without exposing tokens

### **Data Access Control**
- Ensure client data isolation
- Validate client_id parameters
- Prevent cross-client data leakage

## 📈 **Business Value**

### **For Agency Operations**
- **Unified Dashboard**: Facebook Ads + AppsFlyer in one interface
- **Attribution Analysis**: See complete user journey from ad click to app events
- **ROAS Optimization**: Compare Facebook spend to AppsFlyer revenue
- **Client Reporting**: Comprehensive cross-platform performance reports

### **Use Cases**
1. **Campaign Attribution**: "Show me which Facebook campaigns drove the most app installs"
2. **Revenue Analysis**: "What's the LTV of users from Facebook vs Google ads?"
3. **Funnel Optimization**: "Where do users drop off between ad click and purchase?"
4. **Cross-Platform ROAS**: "Compare Facebook ad spend to in-app revenue"

## 🎯 **Next Steps**

### **Immediate (Week 1)**
1. Research AppsFlyer API rate limits and best practices
2. Create AppsFlyer API client utility
3. Implement basic authentication for one client

### **Short-term (Week 2-3)**
1. Add core data retrieval functions (installs, events)
2. Implement multi-client account management
3. Test with real client data

### **Medium-term (Week 4-6)**
1. Add advanced analytics functions (cohorts, LTV)
2. Implement cross-platform analysis
3. Create comprehensive documentation

### **Long-term (Month 2+)**
1. Add automated reporting capabilities
2. Implement data visualization features
3. Create client-specific dashboards

## 💡 **Technical Notes**

### **API Authentication Example**
```javascript
const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

const response = await axios.get(
  `https://hq1.appsflyer.com/api/raw-data/export/app/${appId}/installs_report/v5`,
  { headers }
);
```

### **Date Range Format**
AppsFlyer expects dates in YYYY-MM-DD format:
```javascript
const dateRange = {
  from: '2024-01-01',
  to: '2024-01-31'
};
```

### **App ID Format**
AppsFlyer uses bundle IDs:
- iOS: `id123456789` or `com.company.app`
- Android: `com.company.app`

This integration will provide comprehensive mobile attribution analytics alongside your existing Facebook Ads data, giving you complete visibility into the customer journey from ad impression to in-app conversion.