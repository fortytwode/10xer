# Facebook Ads MCP Server - Technical Architecture & API Documentation

## 🏗️ System Architecture Overview

This Facebook Ads MCP Server is a sophisticated data pipeline that bridges Facebook's Graph API with Language Model interfaces through the Model Context Protocol (MCP). The system provides secure, validated, and optimized access to Facebook advertising data.

## 📋 Table of Contents

1. [Core Components](#core-components)
2. [Data Flow & API Handoffs](#data-flow--api-handoffs)
3. [Authentication Architecture](#authentication-architecture)
4. [Tool System](#tool-system)
5. [Validation & Error Handling](#validation--error-handling)
6. [Event Detection & Conversion Tracking](#event-detection--conversion-tracking)
7. [Image Processing Pipeline](#image-processing-pipeline)
8. [Configuration System](#configuration-system)

---

## 🔧 Core Components

### 1. **MCP Server Core** (`src/index.js`)
- **Purpose**: Main entry point and MCP protocol handler
- **Responsibilities**:
  - Initialize MCP server with protocol compliance
  - Register all available tools with their schemas
  - Route tool calls to appropriate handlers
  - Manage server lifecycle and error handling
- **Key Features**:
  - Tool discovery and registration
  - Request/response protocol handling
  - Global error management
  - Process lifecycle management

### 2. **Facebook API Client** (`src/utils/facebook-api.js`)
- **Purpose**: Centralized Facebook Graph API communication layer
- **Responsibilities**:
  - HTTP request management with proper headers
  - Rate limiting and retry logic
  - Authentication token handling
  - Error normalization and logging
- **Key Features**:
  - Configurable API version and base URL
  - Automatic request formatting
  - Response validation and error parsing
  - Debug logging capabilities

### 3. **Validation System** (`src/utils/validation.js`)
- **Purpose**: Parameter validation using Zod schemas
- **Responsibilities**:
  - Input parameter validation before API calls
  - Type coercion and transformation
  - Required field enforcement
  - Schema-based error reporting
- **Key Features**:
  - Zod-based type definitions
  - Nested object validation
  - Array parameter handling
  - Comprehensive error messages

### 4. **Tool Handlers** (`src/tools/`)
- **Purpose**: Individual Facebook API operation implementations
- **Structure**: Each tool handles a specific Facebook API endpoint
- **Common Pattern**:
  ```javascript
  export async function toolName(args) {
    // 1. Validate parameters
    // 2. Create Facebook API client
    // 3. Make API request(s)
    // 4. Process and format response
    // 5. Return structured data
  }
  ```

---

## 🔄 Data Flow & API Handoffs

### Request Flow Architecture

```
Claude Desktop → MCP Protocol → Server → Validation → Facebook API → Response Processing → MCP Response → Claude
```

### Detailed Request Processing Steps

#### 1. **Initial Request** (Claude → MCP Server)
- **Input**: Natural language request from user
- **Processing**: Claude converts to structured MCP tool call
- **Format**: 
  ```json
  {
    "method": "tools/call",
    "params": {
      "name": "facebook_get_adaccount_insights",
      "arguments": {
        "act_id": "act_589039875116261",
        "fields": ["spend", "actions", "conversions"],
        "date_preset": "last_7d"
      }
    }
  }
  ```

#### 2. **Tool Routing** (`src/index.js:100-142`)
- **Handler**: `CallToolRequestSchema` request handler
- **Process**: Switch statement routes to appropriate tool function
- **Error Handling**: Catches and formats tool-level errors

#### 3. **Parameter Validation** (Each tool's validation step)
- **Validator**: `validateParameters()` function using Zod schemas
- **Location**: `src/utils/validation.js`
- **Process**:
  ```javascript
  const validatedArgs = validateParameters(ValidationSchemas.accountInsights, args);
  ```
- **Output**: Validated, typed parameters or validation error

#### 4. **API Client Instantiation**
- **Creation**: `new FacebookAPIClient()`
- **Configuration**: Loads environment variables and API settings
- **Authentication**: Retrieves and validates access token

#### 5. **Facebook API Request** (`src/utils/facebook-api.js:makeRequest()`)
- **URL Construction**: Base URL + endpoint + parameters
- **Headers**: Authorization, Content-Type, User-Agent
- **Processing**: HTTP request with error handling and retries

#### 6. **Response Processing** (Tool-specific logic)
- **Data Transformation**: Convert Facebook API response to structured format
- **Event Detection**: Advanced logic for conversion tracking (when applicable)
- **Formatting**: Prepare data for Claude consumption

#### 7. **MCP Response** (Back to Claude)
- **Format**: Structured MCP response with content array
- **Types**: Text, images, or structured data based on tool

---

## 🔐 Authentication Architecture

### OAuth Flow Implementation

#### 1. **Login Process** (`src/tools/facebook-login.js`)
```javascript
// OAuth URL generation
const authUrl = `https://www.facebook.com/v23.0/dialog/oauth?` +
  `client_id=${appId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `scope=${scopes.join(',')}&` +
  `response_type=code&` +
  `state=${state}`;
```

#### 2. **Token Storage** (`src/utils/token-storage.js`)
- **Location**: `~/.facebook-ads-mcp/tokens.json`
- **Security**: File permissions set to 600 (owner read/write only)
- **Structure**:
  ```json
  {
    "access_token": "encrypted_token",
    "token_type": "bearer",
    "expires_at": "2024-12-31T23:59:59.000Z"
  }
  ```

#### 3. **Token Validation** (`src/tools/facebook-check-auth.js`)
- **Endpoint**: `/me?fields=id,name`
- **Purpose**: Verify token validity and get user info
- **Fallback**: Automatic re-authentication if token expired

---

## 🛠️ Tool System

### Tool Categories

#### **Authentication Tools**
- `facebook_login`: OAuth browser-based authentication
- `facebook_logout`: Token cleanup and session termination  
- `facebook_check_auth`: Token validation and user info

#### **Account Management Tools**
- `facebook_list_ad_accounts`: Retrieve accessible ad accounts
- `facebook_get_details_of_ad_account`: Account details and settings
- `facebook_fetch_pagination_url`: Handle paginated responses

#### **Analytics & Insights Tools**
- `facebook_get_adaccount_insights`: Performance metrics and breakdowns
- `facebook_get_activities_by_adaccount`: Account activity logs

#### **Creative Analysis Tools**
- `facebook_get_ad_creatives`: Ad creative performance with thumbnails
- `facebook_get_ad_thumbnails`: Embedded image processing

### Tool Schema System (`src/schemas/tool-schemas.js`)

Each tool has a comprehensive JSON schema defining:
- **Input Parameters**: Required/optional fields with types
- **Validation Rules**: Constraints, formats, enums
- **Documentation**: Field descriptions and examples

Example schema structure:
```javascript
facebook_get_adaccount_insights: {
  type: 'object',
  properties: {
    act_id: {
      type: 'string',
      description: 'The ad account ID (e.g., act_1234567890)',
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description: 'Performance metrics to retrieve',
    },
    breakdowns: {
      type: 'array', 
      items: { type: 'string' },
      description: 'Result breakdown dimensions (placement, age, gender, etc.)',
    }
  },
  required: ['act_id', 'fields'],
}
```

---

## ✅ Validation & Error Handling

### Validation Pipeline

#### 1. **Schema Validation** (`src/utils/validation.js`)
```javascript
export function validateParameters(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    throw error;
  }
}
```

#### 2. **API Error Handling** (`src/utils/facebook-api.js`)
```javascript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(`Facebook API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
}
```

#### 3. **Tool-Level Error Handling**
Each tool implements try-catch blocks with specific error contexts:
```javascript
try {
  // Tool logic
} catch (error) {
  console.error(`Error in ${toolName}:`, error);
  return {
    content: [{
      type: "text",
      text: `Error: ${error.message}`
    }],
    isError: true
  };
}
```

---

## 🎯 Event Detection & Conversion Tracking

### Universal Event Detection System (`src/tools/get-account-insights.js:42-82`)

#### **Event Mapping System**
```javascript
const EVENT_NAME_MAPPINGS = {
  'START_TRIAL': ['start_trial', 'start_trial_total', 'start_trial_website'],
  'PURCHASE': ['purchase', 'offsite_conversion.fb_pixel_purchase', 'web_in_store_purchase'],
  'LEAD': ['complete_registration', 'offsite_conversion.fb_pixel_complete_registration'],
  // ... additional mappings
};
```

#### **Conversion Priority Logic**
1. **Priority 1**: Check `conversions` field (higher fidelity data)
2. **Priority 2**: Check `actions` field (fallback data)  
3. **Priority 3**: No match found

#### **Enhanced Field Auto-Addition** (Recent Update)
```javascript
// Automatically include 'conversions' when 'actions' is requested
let enhancedFields = [...fields];
if (fields.includes('actions') && !fields.includes('conversions')) {
  enhancedFields.push('conversions');
}
```

### Optimization Goal Mapping
```javascript
const optimizationMapping = {
  'OFFSITE_CONVERSIONS': 'CUSTOM_EVENT',
  'PURCHASES': 'PURCHASE', 
  'LEADS': 'LEAD',
  'APP_INSTALLS': 'APP_INSTALL'
};
```

---

## 🖼️ Image Processing Pipeline

### Creative Thumbnail System (`src/tools/get-ad-creatives.js`)

#### **Image Retrieval Process**
1. **Creative Data Fetch**: Get ad creative IDs and performance metrics
2. **Thumbnail URL Resolution**: Convert image hashes to accessible URLs
3. **Base64 Encoding**: Download and encode images for reliable display
4. **Performance Correlation**: Link visual elements to campaign performance

#### **Image Hash to URL Conversion** (`src/tools/get-ad-creatives.js:271`)
```javascript
const imageHashResponse = await client.makeRequest(
  `/act_${accountId}/adimages`, 
  { hashes: [imageHash] }
);
```

#### **Base64 Embedding** (`src/tools/get-ad-thumbnails-embedded.js`)
- Downloads images from Facebook CDN
- Converts to base64 data URLs
- Ensures cross-platform compatibility
- Provides fallback for failed downloads

---

## ⚙️ Configuration System

### Environment Configuration

#### **Required Variables**
- `FACEBOOK_ACCESS_TOKEN`: API authentication (OAuth or manual)
- `FACEBOOK_APP_ID`: For OAuth flows  
- `FACEBOOK_APP_SECRET`: For OAuth flows

#### **Optional Variables**
- `FACEBOOK_API_VERSION`: API version (default: v23.0)
- `FACEBOOK_BASE_URL`: API base URL (default: https://graph.facebook.com)
- `FACEBOOK_REDIRECT_URI`: OAuth callback URL
- `MCP_SERVER_NAME`: Server identification
- `DEBUG`: Enable debug logging
- `LOG_LEVEL`: Logging verbosity

### MCP Configuration (`mcp.json`)
```json
{
  "name": "facebook-ads-mcp",
  "version": "1.2.0",
  "description": "Facebook Ads API integration for MCP",
  "main": "src/index.js",
  "env": {
    "FACEBOOK_ACCESS_TOKEN": "your_token_here",
    "FACEBOOK_API_VERSION": "v18.0"
  }
}
```

---

## 🔗 API Handoff Details

### Facebook Graph API Integration Points

#### **Insights API** (`/{ad-account-id}/insights`)
- **Parameters**: fields, level, date_preset, breakdowns, action_breakdowns
- **Response**: Performance metrics with optional breakdowns
- **Processing**: Event detection, conversion prioritization

#### **Adsets API** (`/{ad-account-id}/adsets`) 
- **Parameters**: fields (name, optimization_goal, promoted_object, status)
- **Response**: Campaign configuration data
- **Processing**: Optimization goal mapping for event context

#### **Creatives API** (`/{ad-account-id}/ads`)
- **Parameters**: fields including creative and insights data
- **Response**: Ad creative information with performance correlation
- **Processing**: Image URL resolution and thumbnail generation

#### **Image Hash API** (`/act_{ad-account-id}/adimages`)
- **Parameters**: hashes array
- **Response**: Image URL mappings
- **Processing**: Convert Facebook image hashes to accessible URLs

---

## 📊 Breakdown Support

### Supported Breakdown Dimensions

#### **Demographic Breakdowns**
- `age`: Age group segmentation
- `gender`: Gender-based breakdown  
- `country`: Geographic country breakdown
- `region`: Regional geographic breakdown

#### **Placement Breakdowns**  
- `placement`: Ad placement breakdown
- `platform_position`: Platform-specific positions
- `publisher_platform`: Facebook, Instagram, Audience Network
- `device_platform`: Mobile, desktop, tablet

#### **Performance Breakdowns**
- `impression_device`: Device type for impressions
- `product_id`: Product catalog breakdowns
- `dma`: Designated Market Area (US)

### Implementation
```javascript
// Request with breakdowns
{
  "act_id": "act_123456",
  "fields": ["spend", "actions", "conversions"],
  "breakdowns": ["age", "gender"],
  "action_breakdowns": ["action_type"]
}
```

---

## 🚀 Development Patterns

### Adding New Tools

1. **Create Tool Handler** (`src/tools/new-tool.js`)
2. **Define Validation Schema** (`src/schemas/tool-schemas.js`)
3. **Register Tool** (`src/index.js` - tool registration)
4. **Add Tests** (if applicable)

### Tool Implementation Template
```javascript
import { FacebookAPIClient } from '../utils/facebook-api.js';
import { validateParameters, ValidationSchemas } from '../utils/validation.js';

export async function newTool(args) {
  try {
    // 1. Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.newTool, args);
    
    // 2. Create Facebook API client
    const client = new FacebookAPIClient();
    
    // 3. Make API request
    const response = await client.makeRequest('/endpoint', validatedArgs);
    
    // 4. Process response
    const processedData = processResponse(response);
    
    // 5. Return MCP-formatted response
    return {
      content: [{
        type: "text",
        text: formatOutput(processedData)
      }]
    };
  } catch (error) {
    console.error('Error in newTool:', error);
    return {
      content: [{
        type: "text", 
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
}
```

---

## 📚 Related Documentation

### **AI Usage Guides**
- **[AI Prompting Guide](./PROMPTING-GUIDE.md)**: How to effectively use the tools without API limitations
- **[API Capabilities Reference](./API-CAPABILITIES.md)**: Complete breakdown and analysis capabilities

### **Technical Documentation**
- **[Improvements & Enhancements](./IMPROVEMENTS.md)**: Recent improvements and future roadmap
- **[Universal Server Guide](./UNIVERSAL-SERVER.md)**: Multi-protocol server implementation
- **[Developer Diagnostic Guide](./DEVELOPER-DIAGNOSTIC-GUIDE.md)**: Troubleshooting and debugging
- **[Embedded Images Guide](./EMBEDDED-IMAGES.md)**: Image processing implementation

### **Integration & Analysis**
- **[AppsFlyer Integration Plan](./APPSFLYER-INTEGRATION-PLAN.md)**: Cross-platform attribution
- **[Claude Analysis Prompts](./CLAUDE-ANALYSIS-PROMPTS.md)**: AI interaction patterns

---


## 🎯 Key Technical Decisions

### Why MCP Protocol?
- **Native Claude Integration**: Seamless tool calling without API keys
- **Type Safety**: Schema-based validation and documentation  
- **Extensibility**: Easy to add new tools and capabilities
- **Security**: Token storage outside of AI context

### Why Universal Event Detection?
- **Facebook API Complexity**: Multiple event naming conventions
- **Data Quality**: Prioritize higher-fidelity conversion data
- **Flexibility**: Support custom events and standard events
- **Accuracy**: Reduce reporting discrepancies

### Why Base64 Image Embedding?
- **Reliability**: Facebook CDN URLs often fail in AI contexts
- **Cross-Platform**: Works across different LLM integrations
- **Performance**: Caching reduces repeated downloads
- **User Experience**: Consistent image display

This architecture provides a robust, scalable foundation for Facebook Ads API integration while maintaining security, performance, and ease of use across different AI platforms.