export const CLAUDE_CONNECTOR_MANIFEST = {
  "name": "rocketship-meta-ads-connector",
  "description": "Access your Meta Ad Accounts, insights, creatives, and performance data directly in Claude.",
  "version": "1.0.0",
  "connection": {
    "type": "oauth2",
    "authorization_url": "https://10xer-web-production.up.railway.app/integrations/api/mcp-auth/authorize",
    "token_url": "https://10xer-web-production.up.railway.app/mcp-api/token",
    "scopes": ["ads_read", "ads_management", "business_management"]
  },
  "api": {
    "base_url": "https://10xer-web-production.up.railway.app/mcp-api",
    "authentication": {
      "type": "oauth2_bearer"
    }
  },
  "tools": [
    {
      "name": "facebook_list_ad_accounts",
      "description": "List all Facebook ad accounts accessible to the authenticated user",
      "method": "POST",
      "endpoint": "/tools/facebook_list_ad_accounts",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    {
      "name": "facebook_get_details_of_ad_account",
      "description": "Get detailed information about a specific ad account including balance, currency, and status",
      "method": "POST", 
      "endpoint": "/tools/facebook_get_details_of_ad_account",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {
            "type": "string", 
            "description": "Ad account ID (format: act_123456789)"
          },
          "fields": {
            "type": "array", 
            "items": {"type": "string"}, 
            "description": "Fields to retrieve",
            "default": ["id", "name", "account_status", "currency", "balance", "amount_spent"]
          }
        },
        "required": ["act_id"]
      }
    },
    {
      "name": "facebook_get_adaccount_insights", 
      "description": "Get performance insights and metrics for ad accounts, campaigns, adsets, or individual ads",
      "method": "POST",
      "endpoint": "/tools/facebook_get_adaccount_insights",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {
            "type": "string", 
            "description": "Ad account ID (format: act_123456789)"
          },
          "fields": {
            "type": "array", 
            "items": {"type": "string"}, 
            "description": "Metrics to retrieve (e.g., ['impressions', 'clicks', 'spend', 'cpm', 'ctr', 'reach', 'frequency'])"
          },
          "level": {
            "type": "string", 
            "enum": ["account", "campaign", "adset", "ad"], 
            "description": "Reporting level",
            "default": "account"
          },
          "date_preset": {
            "type": "string", 
            "description": "Date range preset (e.g., today, yesterday, last_7d, last_14d, last_30d, last_90d, this_month, last_month)",
            "default": "last_30d"
          },
          "time_range": {
            "type": "object",
            "description": "Custom date range with 'since' and 'until' in YYYY-MM-DD format",
            "properties": {
              "since": {"type": "string"},
              "until": {"type": "string"}
            }
          },
          "breakdowns": {
            "type": "array", 
            "items": {"type": "string"}, 
            "description": "Breakdown dimensions (e.g., ['age', 'gender', 'country', 'device_platform', 'placement'])"
          },
          "filtering": {
            "type": "array",
            "description": "Filter conditions for the data",
            "items": {
              "type": "object",
              "properties": {
                "field": {"type": "string"},
                "operator": {"type": "string"},
                "value": {"type": "string"}
              }
            }
          }
        },
        "required": ["act_id", "fields"]
      }
    },
    {
      "name": "facebook_get_ad_creatives",
      "description": "Get creative assets and performance data for ads including images, videos, and ad copy", 
      "method": "POST",
      "endpoint": "/tools/facebook_get_ad_creatives",
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {
            "type": "string", 
            "description": "Ad account ID (format: act_123456789)"
          },
          "limit": {
            "type": "number", 
            "description": "Number of creatives to retrieve", 
            "default": 25,
            "maximum": 100
          }
        },
        "required": ["act_id"]
      }
    },
    {
      "name": "facebook_get_activities_by_adaccount",
      "description": "Get activity logs and change history for a specific ad account",
      "method": "POST",
      "endpoint": "/tools/facebook_get_activities_by_adaccount", 
      "inputSchema": {
        "type": "object",
        "properties": {
          "act_id": {
            "type": "string", 
            "description": "Ad account ID (format: act_123456789)"
          },
          "since": {
            "type": "string",
            "description": "Start date for activities in YYYY-MM-DD format"
          },
          "until": {
            "type": "string", 
            "description": "End date for activities in YYYY-MM-DD format"
          },
          "limit": {
            "type": "number",
            "description": "Number of activities to retrieve",
            "default": 25,
            "maximum": 100
          }
        },
        "required": ["act_id"]
      }
    },
    {
      "name": "facebook_get_campaign_details",
      "description": "Get detailed information about a specific campaign",
      "method": "POST",
      "endpoint": "/tools/facebook_get_campaign_details",
      "inputSchema": {
        "type": "object",
        "properties": {
          "campaign_id": {
            "type": "string",
            "description": "Campaign ID"
          },
          "fields": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Fields to retrieve",
            "default": ["id", "name", "objective", "status", "daily_budget", "lifetime_budget", "created_time"]
          }
        },
        "required": ["campaign_id"]
      }
    },
    {
      "name": "facebook_get_adset_details",
      "description": "Get detailed information about a specific ad set including targeting and budget",
      "method": "POST",
      "endpoint": "/tools/facebook_get_adset_details",
      "inputSchema": {
        "type": "object",
        "properties": {
          "adset_id": {
            "type": "string",
            "description": "Ad set ID"
          },
          "fields": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Fields to retrieve",
            "default": ["id", "name", "status", "daily_budget", "lifetime_budget", "targeting", "optimization_goal"]
          }
        },
        "required": ["adset_id"]
      }
    },
    {
      "name": "facebook_get_creative_asset_url_by_ad_id",
      "description": "Get creative asset URLs and details for a specific ad including images, videos, and ad copy",
      "method": "POST",
      "endpoint": "/tools/facebook_get_creative_asset_url_by_ad_id",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ad_id": {
            "type": "string",
            "description": "Ad ID to get creative assets for"
          }
        },
        "required": ["ad_id"]
      }
    }
  ]
};