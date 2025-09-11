export const CLAUDE_CONNECTOR_MANIFEST = {
  "name": "rocketship-meta-ads-connector",
  "description": "Access your Meta Ad Accounts, insights, creatives, and performance data directly in Claude.",
  "api_url": process.env.DEPLOYED_URL || "https://10xer-web-production.up.railway.app",
  "version": "1.0.0",
  "tools": [
    {
      "name": "facebook_list_ad_accounts",
      "description": "List all Facebook ad accounts accessible to the authenticated user",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    {
      "name": "facebook_get_adaccount_insights", 
      "description": "Get performance insights and metrics for ad accounts, campaigns, or ads",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {"type": "string", "description": "Ad account ID (format: act_123456789)"},
          "fields": {"type": "array", "items": {"type": "string"}, "description": "Metrics to retrieve"},
          "level": {"type": "string", "enum": ["account", "campaign", "adset", "ad"], "description": "Reporting level"},
          "date_preset": {"type": "string", "description": "Date range preset (e.g., last_7_days, last_30_days)"},
          "breakdowns": {"type": "array", "items": {"type": "string"}, "description": "Breakdown dimensions"}
        },
        "required": ["act_id", "fields"]
      }
    },
    {
      "name": "facebook_get_ad_creatives",
      "description": "Get creative assets and performance data for ads", 
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {"type": "string", "description": "Ad account ID"},
          "limit": {"type": "number", "description": "Number of creatives to retrieve", "default": 25}
        },
        "required": ["act_id"]
      }
    },
    {
      "name": "facebook_get_details_of_ad_account",
      "description": "Get detailed information about a specific ad account",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {"type": "string", "description": "Ad account ID"},
          "fields": {"type": "array", "items": {"type": "string"}, "description": "Fields to retrieve"}
        },
        "required": ["act_id"]
      }
    },
    {
      "name": "facebook_get_activities_by_adaccount",
      "description": "Get activity logs for a specific ad account",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {"type": "string", "description": "Ad account ID"}
        },
        "required": ["act_id"]
      }
    }
  ]
};
