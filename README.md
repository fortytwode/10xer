# Facebook Ads MCP Server

A Model Context Protocol (MCP) server that provides Facebook Ads functionality for Claude and other MCP clients. Access your Facebook advertising data, insights, and account information directly through natural language conversations.

[![npm version](https://img.shields.io/npm/v/facebook-ads-mcp-server.svg)](https://www.npmjs.com/package/facebook-ads-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start for Claude Desktop Users

### 1. Install the Server
```bash
npm install -g facebook-ads-mcp-server
```

### 2. Create Facebook Developer App
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app or use existing one
3. Add "Facebook Login" product
4. Configure OAuth settings:
   - **Client OAuth Login**: ON
   - **Web OAuth Login**: ON  
   - **Valid OAuth Redirect URIs**: `http://localhost:3002/auth/callback`

### 3. Configure Claude Desktop
Add this to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "facebook-ads": {
      "command": "facebook-ads-mcp",
      "env": {
        "FACEBOOK_APP_ID": "your_facebook_app_id",
        "FACEBOOK_APP_SECRET": "your_facebook_app_secret",
        "FACEBOOK_REDIRECT_URI": "http://localhost:3002/auth/callback"
      }
    }
  }
}
```

### 4. Restart Claude Desktop
After adding the configuration, restart Claude Desktop and start asking about your Facebook ads!

## 💬 Example Conversations with Claude

Once configured, you can ask Claude things like:

- *"Login to Facebook"* (OAuth flow will open in browser)
- *"Check my Facebook authentication status"*
- *"Show me all my Facebook ad accounts"*
- *"What's the current balance and status of my main ad account?"*
- *"Get performance insights for my ad account for the last 30 days"*
- *"Show me recent activities on account act_123456"*
- *"Logout from Facebook"*

## ✨ Features

### **Authentication**
- **OAuth Login**: Secure browser-based Facebook authentication
- **Token Management**: Automatic secure token storage and retrieval
- **Session Management**: Login, logout, and authentication status checking
- **Production Security**: Hardcoded tokens only allowed in test mode (NODE_ENV=test)

### **Facebook Ads Data**
- **List Ad Accounts**: Get all accessible Facebook ad accounts
- **Account Details**: Get detailed information about specific ad accounts  
- **Account Insights**: Retrieve performance metrics and analytics data
- **Account Activities**: Get activity logs for ad accounts
- **Pagination Support**: Handle large datasets with automatic pagination

## Installation

1. **Clone and install dependencies:**
   ```bash
   cd facebook-ads-mcp
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Facebook access token
   ```

3. **Get Facebook Access Token:**
   - Visit [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select your app and generate a token with required permissions:
     - `ads_read`
     - `ads_management` 
     - `business_management`

## Usage

### Running the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### MCP Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "facebook-ads-mcp": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/facebook-ads-mcp",
      "env": {
        "FACEBOOK_ACCESS_TOKEN": "your_facebook_access_token"
      }
    }
  }
}
```

## Available Tools

### 1. facebook_list_ad_accounts

Lists all Facebook ad accounts accessible with the provided credentials.

**Parameters:** None

**Example:**
```javascript
// No parameters required
{}
```

**Response:**
```json
{
  "adaccounts": {
    "data": [
      {
        "name": "My Ad Account",
        "id": "act_1234567890"
      }
    ]
  },
  "id": "user_id"
}
```

### 2. facebook_fetch_pagination_url

Fetches data from a Facebook Graph API pagination URL.

**Parameters:**
- `url` (string, required): The complete pagination URL

**Example:**
```javascript
{
  "url": "https://graph.facebook.com/v18.0/act_123/insights?after=cursor_string&access_token=..."
}
```

### 3. facebook_get_details_of_ad_account

Gets details of a specific ad account based on requested fields.

**Parameters:**
- `act_id` (string, required): The ad account ID (e.g., "act_1234567890")
- `fields` (array, optional): Fields to retrieve

**Available Fields:**
- `name`, `business_name`, `age`, `account_status`, `balance`, `amount_spent`
- `attribution_spec`, `account_id`, `business`, `business_city`
- `brand_safety_content_filter_levels`, `currency`, `created_time`, `id`

**Example:**
```javascript
{
  "act_id": "act_1234567890",
  "fields": ["name", "account_status", "balance", "currency"]
}
```

### 4. facebook_get_adaccount_insights

Retrieves performance insights for a specified Facebook ad account.

**Parameters:**
- `act_id` (string, required): The ad account ID
- `fields` (array, required): Performance metrics to retrieve
- `date_preset` (string, optional): Predefined time range (last_7d, last_30d, etc.)
- `level` (string, optional): Aggregation level (account, campaign, adset, ad)
- `breakdowns` (array, optional): Result breakdown dimensions (placement, age, gender, country, etc.)
- `action_breakdowns` (array, optional): Breakdown dimensions for actions/conversions
- `time_range` (object, optional): Custom time range with since/until dates
- `time_increment` (string/number, optional): Time aggregation period (1=daily, 7=weekly, "monthly"=monthly)
- `limit` (number, optional): Maximum results per page
- `after`/`before` (string, optional): Pagination cursors

**Examples:**

*Basic Performance Data:*
```javascript
{
  "act_id": "act_1234567890",
  "fields": ["impressions", "clicks", "spend", "ctr"],
  "date_preset": "last_30d",
  "level": "campaign"
}
```

*Performance by Placement with Conversions:*
```javascript
{
  "act_id": "act_1234567890", 
  "fields": ["spend", "actions", "conversions", "cost_per_action_type"],
  "breakdowns": ["placement"],
  "action_breakdowns": ["action_type"],
  "date_preset": "last_7d"
}
```

*Demographic Analysis (Age/Gender):*  
```javascript
{
  "act_id": "act_1234567890",
  "fields": ["spend", "actions", "conversions"],
  "breakdowns": ["age", "gender"], 
  "action_breakdowns": ["action_type"],
  "date_preset": "last_7d"
}
```

*Daily Performance Breakdown:*
```javascript
{
  "act_id": "act_1234567890",
  "fields": ["spend", "actions", "conversions", "date_start", "date_stop"],
  "time_increment": 1,  // 1 = daily breakdown
  "date_preset": "last_30d"
}
```

#### **🎯 Enhanced Conversion Tracking**
This tool automatically enhances conversion tracking by:

**Problem Solved**: Custom events like `start_trial` often don't appear in the Facebook API's `actions` field but are available in the `conversions` field. Previously, requests for only `actions` would miss conversion events, leading to incomplete data.

**Solution**: When you request the `actions` field, the system automatically includes `conversions` as well, then uses a priority system:
1. **Priority 1**: Checks `conversions` field (higher fidelity data)
2. **Priority 2**: Falls back to `actions` field if conversion data unavailable
3. **Priority 3**: Reports no match found

**Example with Auto-Enhancement**:
```javascript
// Your request:
{
  "fields": ["spend", "actions"]
}

// Automatically becomes:
{
  "fields": ["spend", "actions", "conversions"]  // conversions auto-added
}
```

This ensures you capture conversion events like `start_trial`, `purchase`, and custom events that might only exist in the conversions field.

### 5. facebook_get_activities_by_adaccount

Retrieves activities for a Facebook ad account.

**Parameters:**
- `act_id` (string, required): The ad account ID
- `fields` (array, optional): Activity fields to retrieve
- `since`/`until` (string, optional): Date range in YYYY-MM-DD format
- `time_range` (object, optional): Custom time range object
- `limit` (number, optional): Maximum activities per page

**Example:**
```javascript
{
  "act_id": "act_1234567890",
  "fields": ["event_type", "event_time", "actor_name"],
  "since": "2024-01-01",
  "until": "2024-01-31"
}
```

## Error Handling

The server provides detailed error responses with appropriate error codes:

- `FACEBOOK_API_ERROR`: Facebook Graph API errors
- `VALIDATION_ERROR`: Parameter validation failures
- `TIMEOUT_ERROR`: Request timeout errors
- `INTERNAL_ERROR`: Server-side errors

## Environment Variables

```bash
# Required
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token

# Optional
FACEBOOK_API_VERSION=v18.0
FACEBOOK_BASE_URL=https://graph.facebook.com
MCP_SERVER_NAME=facebook-ads-mcp
MCP_SERVER_VERSION=1.0.0
DEBUG=true
LOG_LEVEL=info
```

## Testing

```bash
# Run test script
npm test
```

## Facebook API Permissions

Ensure your access token has the following permissions:

- `ads_read`: Read ad account data
- `ads_management`: Manage ad accounts (if needed)
- `business_management`: Access business information

## Troubleshooting

### Common Issues

1. **Invalid Access Token**
   - Verify token in [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Check token expiration
   - Ensure required permissions are granted

2. **API Rate Limiting**
   - Facebook enforces rate limits on API calls
   - Implement appropriate delays between requests

3. **Permission Errors**
   - Verify ad account access permissions
   - Check business manager roles

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm start
```

## Architecture

```
facebook-ads-mcp/
├── src/
│   ├── index.js                 # Main MCP server
│   ├── tools/                   # Tool implementations
│   │   ├── list-ad-accounts.js
│   │   ├── fetch-pagination.js
│   │   ├── get-account-details.js
│   │   ├── get-account-insights.js
│   │   └── get-account-activities.js
│   ├── utils/                   # Utilities
│   │   ├── facebook-api.js      # Facebook API client
│   │   ├── validation.js        # Parameter validation
│   │   └── error-handler.js     # Error handling
│   └── schemas/
│       └── tool-schemas.js      # JSON schemas
├── package.json
├── mcp.json                     # MCP configuration
└── README.md
```

## 📋 Claude Desktop Setup Guide

### Finding Your MCP Settings File

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%/Claude/claude_desktop_config.json
```

### Complete Configuration Example

```json
{
  "mcpServers": {
    "facebook-ads": {
      "command": "facebook-ads-mcp",
      "env": {
        "FACEBOOK_ACCESS_TOKEN": "EAAxxxxxxxxxxxxx",
        "FACEBOOK_API_VERSION": "v23.0"
      }
    }
  }
}
```

### Troubleshooting

**Server not starting?**
- Ensure Node.js 18+ is installed
- Verify the access token is valid
- Check Claude Desktop logs

**No data returned?**
- Verify token permissions include `ads_read`
- Check if ad accounts have recent activity
- Ensure account access permissions

**Permission errors?**
- Regenerate token with proper scopes
- Verify business manager access

## 🔧 Development Setup

For developers who want to modify or extend this server:

```bash
# Clone the repository
git clone https://github.com/fortytwode/10xer.git
cd 10xer

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Facebook access token

# Run in development mode
npm run dev

# Run tests
npm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🗺️ Roadmap

### Current Status: v1.2.0 ✅
- OAuth 2.0 authentication with browser login
- 6 core Facebook Ads API tools including **Creative Insights**
- **NEW**: Ad creative thumbnails with performance analysis
- Secure token storage and management
- Claude Desktop integration

### 🎯 Planned Features

#### **✅ COMPLETED: Creative Insights & Thumbnails** 🖼️
**Status**: ✅ **Released in v1.2.0**

- ✅ **New Tool**: `facebook_get_ad_creatives`
- ✅ **Visual Analysis**: Ad creative thumbnails with performance metrics
- ✅ **Creative Types**: Support for image ads, video detection
- ✅ **Performance Correlation**: Link creative elements to campaign performance
- ✅ **Implementation**: Direct thumbnail URLs from Facebook API
- ✅ **Filtering**: Performance-based filtering (min purchases, max cost per purchase)
- ✅ **Batch Processing**: Efficient batch API requests for large datasets

**Live Use Cases**:
- "Show me my top-performing ad creatives with thumbnails"
- "Which creative formats have the best cost per purchase?"
- "Analyze creative performance by visual elements"

#### **Priority 1: Pre-formatted Notion Reports** 📊
**Timeline**: Current priority  
**Status**: **Next Up**

- **Export Formats**: Structured data ready for Notion import
- **Report Templates**: Campaign performance, creative analysis, account summaries
- **Automation**: Generate reports with charts and insights
- **Integration**: Direct Notion API connectivity (future)

**Use Cases**:
- "Generate a campaign performance report for Notion"
- "Create a weekly ad account summary with insights"
- "Export creative analysis with recommendations"

#### **Priority 2: Multi-Platform Tool Calling** 🌐
**Timeline**: 1-2 months  
**Status**: Research phase

- **OpenAI Integration**: REST API endpoints for GPT tool calling
- **Gemini Support**: Google AI platform compatibility  
- **Unified API**: Single backend serving multiple AI platforms
- **Documentation**: Platform-specific setup guides

**Technical Approach**:
- Dual architecture: MCP server + REST API
- Shared business logic and Facebook API client
- Platform-specific authentication handling

### 🔮 Future Considerations

#### **Advanced Analytics** 📈
- Cohort analysis and attribution modeling
- Predictive performance insights
- Automated optimization recommendations
- Cross-platform attribution (Facebook + Google Ads)

#### **Enhanced Media Support** 🎥
- Video ad thumbnails and preview frames
- Carousel ad analysis with multiple images
- Dynamic creative optimization insights
- A/B testing automation and analysis

#### **Enterprise Features** 🏢
- Multi-account management dashboard
- Team collaboration and permissions
- Custom reporting and data exports
- Advanced security and compliance features

### 📊 Development Priorities

| Feature | Business Value | Technical Complexity | User Demand | Priority Score |
|---------|---------------|---------------------|-------------|----------------|
| Creative Thumbnails | High | Medium | High | **9.5/10** |
| Notion Reports | High | Medium | Medium | **8.5/10** |
| OpenAI/Gemini | Medium | High | Medium | **6.5/10** |
| Video Support | Medium | High | Low | **5.0/10** |

## 📚 Documentation

### **For AI Assistants & Users**
- **[AI Prompting Guide](./docs/PROMPTING-GUIDE.md)**: How to effectively use Facebook Ads tools without limitations
- **[API Capabilities Reference](./docs/API-CAPABILITIES.md)**: Complete breakdown and analysis capabilities

### **Technical Documentation**
- **[Technical Architecture & API Documentation](./docs/README.md)**: Comprehensive system design and implementation details
- **[Recent Improvements & Enhancements](./docs/IMPROVEMENTS.md)**: Latest features and future roadmap
- **[Developer Diagnostic Guide](./docs/DEVELOPER-DIAGNOSTIC-GUIDE.md)**: Troubleshooting and debugging
- **[Universal Server Implementation](./docs/UNIVERSAL-SERVER.md)**: Multi-protocol server support

### 🤝 Contributing

We welcome contributions to help build these features! Check our [GitHub Issues](https://github.com/fortytwode/10xer/issues) for current development tasks.

---

## 📄 License

MIT License