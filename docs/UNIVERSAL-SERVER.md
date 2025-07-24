# Universal Facebook Ads Server

The Universal Facebook Ads Server supports **3 protocols** in a single package:

- ✅ **MCP (Model Context Protocol)** - Claude Desktop integration
- ✅ **OpenAI Function Calling** - GPT-4, GPT-3.5-turbo integration  
- ✅ **Gemini Function Calling** - Google Gemini integration

## 🚀 Quick Start

### 1. Install Package
```bash
npm install -g facebook-ads-mcp-server@latest
```

### 2. Choose Your Protocol

#### MCP Mode (Default - Claude Desktop)
```bash
facebook-ads-mcp
# or
facebook-ads-universal
```

#### API Mode (OpenAI + Gemini)
```bash
SERVER_MODE=api facebook-ads-universal
# Server runs on http://localhost:3003
```

#### Both Modes (MCP + API)
```bash
SERVER_MODE=both facebook-ads-universal
```

## 📡 API Endpoints

### OpenAI Function Calling

**Get Function Definitions:**
```bash
GET http://localhost:3003/openai/functions/definitions
```

**Call Function:**
```bash
POST http://localhost:3003/openai/functions
{
  "function_call": {
    "name": "facebook_get_ad_thumbnails",
    "arguments": "{\"ad_ids\":[\"120230959651980230\"]}"
  }
}
```

### Gemini Function Calling

**Get Function Definitions:**
```bash
GET http://localhost:3003/gemini/functions/definitions  
```

**Call Function:**
```bash
POST http://localhost:3003/gemini/functions
{
  "function_call": {
    "name": "facebook_get_ad_thumbnails", 
    "args": {"ad_ids": ["120230959651980230"]}
  }
}
```

### Generic Endpoints

**Health Check:**
```bash
GET http://localhost:3003/health
```

**List All Tools:**
```bash
GET http://localhost:3003/tools
```

## 🔧 Integration Examples

### OpenAI GPT-4 Integration

```javascript
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get Facebook Ads functions
const { data } = await axios.get('http://localhost:3003/openai/functions/definitions');
const functions = data.functions;

// Use with OpenAI
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Show me ad thumbnails for my account' }],
  functions: functions,
  function_call: 'auto'
});

// Handle function calls
if (completion.choices[0].message.function_call) {
  const result = await axios.post('http://localhost:3003/openai/functions', {
    function_call: completion.choices[0].message.function_call
  });
  console.log('📊 Result:', result.data);
}
```

### Gemini Integration

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get Facebook Ads functions
const { data } = await axios.get('http://localhost:3003/gemini/functions/definitions');
const functions = data.functions;

// Use with Gemini
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [{ functionDeclarations: functions }]
});

const chat = model.startChat();
const result = await chat.sendMessage('Show me ad performance data');

// Handle function calls
if (result.response.functionCalls()) {
  const functionCall = result.response.functionCalls()[0];
  const functionResult = await axios.post('http://localhost:3003/gemini/functions', {
    function_call: functionCall
  });
  console.log('📊 Result:', functionResult.data);
}
```

## 🎯 Key Benefits

### For OpenAI Integration:
- ✅ **Better Image Handling** - OpenAI displays images inline reliably
- ✅ **Web App Integration** - Easy to integrate into web applications
- ✅ **Multiple Models** - Works with GPT-4, GPT-3.5-turbo, etc.

### For Gemini Integration:
- ✅ **Native Function Calling** - Built-in Gemini function support
- ✅ **Multimodal** - Handles text + images seamlessly
- ✅ **Cost Effective** - Competitive pricing for high-volume usage

### For Developers:
- ✅ **Single Codebase** - One server, three protocols
- ✅ **Reused Logic** - All Facebook API integration unchanged
- ✅ **Easy Deployment** - Choose your preferred protocol

## 🛠️ Available Tools

All 10 Facebook Ads tools work across all protocols:

1. `facebook_login` - OAuth authentication
2. `facebook_logout` - Clear credentials
3. `facebook_check_auth` - Check auth status
4. `facebook_list_ad_accounts` - List ad accounts
5. `facebook_get_details_of_ad_account` - Account details
6. `facebook_get_adaccount_insights` - Performance insights
7. `facebook_get_activities_by_adaccount` - Account activities
8. `facebook_fetch_pagination_url` - Handle pagination
9. `facebook_get_ad_creatives` - High-performing creatives
10. `facebook_get_ad_thumbnails` - Ad thumbnail images ⭐

## 🚀 Deployment Options

### Development
```bash
npm run dev:universal        # MCP mode with auto-reload
SERVER_MODE=api npm run dev:universal  # API mode with auto-reload
```

### Production
```bash
npm run start:universal      # MCP mode
npm run start:api           # API mode  
npm run start:both          # Both modes
```

### Docker
```dockerfile
FROM node:18
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 3003
CMD ["npm", "run", "start:api"]
```

### Environment Variables
```bash
# Server configuration
SERVER_MODE=api              # api, mcp, or both
PORT=3003                   # API server port

# Facebook credentials (same as before)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_secret
FACEBOOK_REDIRECT_URI=http://localhost:3002/auth/callback
```

## 🎉 Migration from MCP-only

Existing MCP setups continue to work unchanged. To add API support:

1. **Keep existing Claude Desktop config** ✅
2. **Add API mode for other integrations**:
   ```bash
   SERVER_MODE=both facebook-ads-universal
   ```
3. **Use new endpoints for OpenAI/Gemini** 🚀

The universal server is **100% backward compatible** with existing MCP deployments.