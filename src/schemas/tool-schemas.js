export const TOOL_SCHEMAS = {
  facebook_login: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },

  facebook_logout: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },

  facebook_check_auth: {
    type: 'object', 
    properties: {},
    required: [],
    additionalProperties: false,
  },

  facebook_list_ad_accounts: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },

  facebook_fetch_pagination_url: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The complete pagination URL',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },

  facebook_get_details_of_ad_account: {
    type: 'object',
    properties: {
      act_id: {
        type: 'string',
        description: 'The act ID of the ad account, example: act_1234567890',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Fields to retrieve. Available: name, business_name, age, account_status, balance, amount_spent, attribution_spec, account_id, business, business_city, brand_safety_content_filter_levels, currency, created_time, id',
      },
    },
    required: ['act_id'],
    additionalProperties: false,
  },

  facebook_get_adaccount_insights: {
    type: 'object',
    properties: {
      act_id: {
        type: 'string',
        description: 'The target ad account ID, prefixed with act_',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Performance metrics to retrieve',
      },
      date_preset: {
        type: 'string',
        description: 'Predefined time range: last_7d, last_30d, last_90d, etc.',
      },
      level: {
        type: 'string',
        description: 'Aggregation level: account, campaign, adset, ad',
      },
      action_attribution_windows: {
        type: 'array',
        items: { type: 'string' },
        description: 'Attribution windows for actions',
      },
      action_breakdowns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Breakdown dimensions for actions',
      },
      breakdowns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Result breakdown dimensions',
      },
      time_range: {
        type: 'object',
        properties: {
          since: { type: 'string' },
          until: { type: 'string' },
        },
        description: 'Custom time range with since/until dates',
      },
      limit: {
        type: 'number',
        description: 'Maximum results per page',
      },
      sort: {
        type: 'string',
        description: 'Sort field and direction',
      },
      after: {
        type: 'string',
        description: 'Pagination cursor for next page',
      },
      before: {
        type: 'string',
        description: 'Pagination cursor for previous page',
      },
      time_increment: {
        type: ['string', 'number'],
        description: 'Time aggregation period. Use 1 for daily, 7 for weekly, monthly for monthly breakdowns',
      },
    },
    required: ['act_id', 'fields'],
    additionalProperties: false,
  },

  facebook_get_activities_by_adaccount: {
    type: 'object',
    properties: {
      act_id: {
        type: 'string',
        description: 'Ad account ID prefixed with act_',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Activity fields to retrieve',
      },
      since: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      until: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format',
      },
      time_range: {
        type: 'object',
        properties: {
          since: { type: 'string' },
          until: { type: 'string' },
        },
        description: 'Custom time range object',
      },
      limit: {
        type: 'number',
        description: 'Maximum activities per page',
      },
      after: {
        type: 'string',
        description: 'Pagination cursor',
      },
      before: {
        type: 'string',
        description: 'Pagination cursor',
      },
    },
    required: ['act_id'],
    additionalProperties: false,
  },

  facebook_get_ad_creatives: {
    type: 'object',
    properties: {
      ad_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of Facebook ad IDs to get creatives for',
        minItems: 1,
        maxItems: 50
      },
      include_images: {
        type: 'boolean',
        default: true,
        description: 'Whether to download and embed images as base64'
      }
    },
    required: ['ad_ids'],
    additionalProperties: false,
  },

};