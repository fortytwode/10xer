// #!/usr/bin/env node

// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// import dotenv from 'dotenv';

// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';

// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// import { listAdAccounts } from './tools/list-ad-accounts.js';
// import { fetchPaginationUrl } from './tools/fetch-pagination.js';
// import { getAccountDetails } from './tools/get-account-details.js';
// import { getAccountInsights } from './tools/get-account-insights.js';
// import { getAccountActivities } from './tools/get-account-activities.js';
// import { getAdCreatives } from './tools/get-ad-creatives.js';
// import { facebookLogin } from './tools/facebook-login.js';
// import { facebookLogout } from './tools/facebook-logout.js';
// import { facebookCheckAuth } from './tools/facebook-check-auth.js';

// import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';

// dotenv.config({ path: new URL('../.env', import.meta.url) });

// import { getFacebookTokenFromCLI } from './utils/cli-args.js';
// import { TokenStorage } from './auth/token-storage.js';

// class FacebookAdsMCPServer {
//   constructor() {
//     this.server = new Server({
//       name: process.env.MCP_SERVER_NAME || 'facebook-ads-mcp',
//       version: process.env.MCP_SERVER_VERSION || '1.0.0',
//     }, {
//       capabilities: { tools: {} },
//     });

//     this.setupToolHandlers();

//     // Auto-store CLI token
//     // const { userId, accessToken, expiresIn } = getFacebookTokenFromCLI();
//     // if (accessToken) {
//     //   TokenStorage.storeTokenForUser(userId, accessToken, expiresIn)
//     //     .then(() => console.error('✅ CLI Facebook token stored on startup'))
//     //     .catch((err) => console.error('❌ Failed to store CLI token on startup:', err.message));
//     // }
//   }

//   setupToolHandlers() {
//     this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
//       tools: [
//         // { name: 'facebook_login', description: 'Login to Facebook', inputSchema: TOOL_SCHEMAS.facebook_login },
//         // { name: 'facebook_logout', description: 'Logout from Facebook', inputSchema: TOOL_SCHEMAS.facebook_logout },
//         { name: 'facebook_check_auth', description: 'Check Facebook auth status', inputSchema: TOOL_SCHEMAS.facebook_check_auth },
//         { name: 'facebook_list_ad_accounts', description: 'List all Facebook ad accounts', inputSchema: TOOL_SCHEMAS.facebook_list_ad_accounts },
//         { name: 'facebook_fetch_pagination_url', description: 'Fetch data from a pagination URL', inputSchema: TOOL_SCHEMAS.facebook_fetch_pagination_url },
//         { name: 'facebook_get_details_of_ad_account', description: 'Get details of an ad account', inputSchema: TOOL_SCHEMAS.facebook_get_details_of_ad_account },
//         { name: 'facebook_get_adaccount_insights', description: 'Get performance insights', inputSchema: TOOL_SCHEMAS.facebook_get_adaccount_insights },
//         { name: 'facebook_get_activities_by_adaccount', description: 'Get activities by ad account', inputSchema: TOOL_SCHEMAS.facebook_get_activities_by_adaccount },
//         { name: 'facebook_get_ad_creatives', description: 'Get creative assets for ads', inputSchema: TOOL_SCHEMAS.facebook_get_ad_creatives },
//       ],
//     }));

//     this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
//       const { name, arguments: args } = request.params;
//       switch (name) {
//         // case 'facebook_login': return facebookLogin(args);
//         // case 'facebook_logout': return facebookLogout(args);
//         case 'facebook_check_auth': return facebookCheckAuth(args);
//         case 'facebook_list_ad_accounts': return listAdAccounts(args);
//         case 'facebook_fetch_pagination_url': return fetchPaginationUrl(args);
//         case 'facebook_get_details_of_ad_account': return getAccountDetails(args);
//         case 'facebook_get_adaccount_insights': return getAccountInsights(args);
//         case 'facebook_get_activities_by_adaccount': return getAccountActivities(args);
//         case 'facebook_get_ad_creatives': return getAdCreatives(args);
//         default: throw new Error(`Unknown tool: ${name}`);
//       }
//     });
//   }

//   async run() {
//     const stdioTransport = new StdioServerTransport();
//     await this.server.connect(stdioTransport);
//     console.error('✅ Facebook Ads MCP server running on stdio');

//     const app = express();
//     app.use(bodyParser.json());
//     app.use(cors({
//       origin: process.env.TOKEN_API_BASE_URL || 'http://localhost:3000/'
//     }));

//     app.use(express.static('public'));

//     app.get('/', (_req, res) => {
//       res.send('👋 Welcome to Facebook Ads MCP server running');
//     });

//     app.get('/health', (_req, res) => {
//       res.sendFile(path.join(__dirname, 'public', 'index.html'));
//     });

//     app.get('/auth/callback', (_req, res) => {
//       res.sendFile(path.join(__dirname, 'public', '/auth/callback.html'));
//     });

//     app.get('/config', (_req, res) => {
//       res.json({ facebookAppId: process.env.FACEBOOK_APP_ID });
//     });

//     app.get('/tools', async (_req, res) => {
//       const result = await this.server.request(ListToolsRequestSchema, {});
//       res.json(result);
//     });

//     app.post('/tool', async (req, res) => {
//       try {
//         const result = await this.server.request(CallToolRequestSchema, {
//           name: req.body.name,
//           arguments: req.body.arguments,
//         });
//         res.json(result);
//       } catch (err) {
//         res.status(500).json({ error: err.message });
//       }
//     });

//     // POST /auth/token — store token per user
//     app.post('/auth/token', async (req, res) => {
//       try {
//         const { userId, accessToken, expiresIn } = req.body;

//         if (!userId || !accessToken) {
//           return res.status(400).json({ error: 'Missing userId or accessToken' });
//         }

//         await TokenStorage.storeTokenForUser(userId, accessToken, expiresIn);
//         res.json({ success: true, message: 'Token stored successfully' });
//       } catch (err) {
//         res.status(500).json({ error: err.message });
//       }
//     });

//     // GET /auth/token/:userId — get user's token
//     app.get('/auth/token/:userId', async (req, res) => {
//       try {
//         const userId = req.params.userId;
//         const token = await TokenStorage.getTokenForUser(userId);

//         if (!token) {
//           return res.status(404).json({ error: 'Token not found or expired' });
//         }

//         res.json({ success: true, accessToken: token });
//       } catch (err) {
//         res.status(500).json({ error: err.message });
//       }
//     });

//     // GET /auth/token-info/:userId — token status/info
//     app.get('/auth/token-info/:userId', async (req, res) => {
//       try {
//         const userId = req.params.userId;
//         const info = await TokenStorage.getTokenInfoForUser(userId);
//         res.json(info);
//       } catch (err) {
//         res.status(500).json({ error: err.message });
//       }
//     });

//     // DELETE /auth/token/:userId — clear token
//     app.delete('/auth/token/:userId', async (req, res) => {
//       try {
//         const userId = req.params.userId;
//         await TokenStorage.clearTokenForUser(userId);
//         res.json({ success: true, message: 'Token cleared' });
//       } catch (err) {
//         res.status(500).json({ error: err.message });
//       }
//     });

//     app.get('/auth/token-info', async (_req, res) => {
//       const info = await TokenStorage.getTokenInfo();
//       res.json(info);
//     });

//     const port = process.env.PORT || 3001;
//     app.listen(port, () => {
//       console.error(`🌍 Facebook Ads MCP server running on http://localhost:${port}`);
//     });
//   }
// }

// const server = new FacebookAdsMCPServer();
// server.run().catch((error) => {
//   console.error('Failed to start server:', error);
//   process.exit(1);
// });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { listAdAccounts } from './tools/list-ad-accounts.js';
import { fetchPaginationUrl } from './tools/fetch-pagination.js';
import { getAccountDetails } from './tools/get-account-details.js';
import { getAccountInsights } from './tools/get-account-insights.js';
import { getAccountActivities } from './tools/get-account-activities.js';
import { getAdCreatives } from './tools/get-ad-creatives.js';
// import { facebookLogin } from './tools/facebook-login.js';
// import { facebookLogout } from './tools/facebook-logout.js';
// import { facebookCheckAuth } from './tools/facebook-check-auth.js';

import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

import { getFacebookTokenFromCLI } from './utils/cli-args.js';
import { TokenStorage } from './auth/token-storage.js';

class FacebookAdsMCPServer {
  constructor({ serverName, sseUrl, apiKey }) {
  this.serverName = serverName;
  this.sseUrl = sseUrl;
  this.apiKey = apiKey;

  // Remove trailing /sse if exists
  this.apiBaseUrl = this.sseUrl.replace(/\/sse$/, '');

  // console.log("serverName->", serverName);
  // console.log("sseUrl->", sseUrl);
  // console.log("apiKey->", apiKey);

  this.facebookAccessToken = null; // placeholder

  this.server = new Server({
    name: this.serverName || process.env.MCP_SERVER_NAME || 'facebook-ads-mcp',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  }, {
    capabilities: { tools: {} },
  });

  this.setupToolHandlers();
  // this.fetchFacebookAccessToken();
}

  // Example helper to do fetch with auth headers from instance props
  async fetchWithAuth(url, options = {}) {
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${this.apiKey}`;
    headers['X-Server-Name'] = this.serverName;
    return fetch(url, { ...options, headers });
  }

  async fetchFacebookAccessToken() {
    const url = `${this.apiBaseUrl}/facebook_token`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch Facebook token: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.facebook_access_token) {
        this.facebookAccessToken = data.facebook_access_token;
        console.error('✅ Facebook access token fetched:', this.facebookAccessToken.slice(0, 10) + '...');
      } else {
        throw new Error('Token not present in response');
      }
    } catch (err) {
      console.error('❌ Error fetching Facebook token:', err.message);
      throw err;
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // { name: 'facebook_login', description: 'Login to Facebook', inputSchema: TOOL_SCHEMAS.facebook_login },
        // { name: 'facebook_logout', description: 'Logout from Facebook', inputSchema: TOOL_SCHEMAS.facebook_logout },
        // { name: 'facebook_check_auth', description: 'Check Facebook auth status', inputSchema: TOOL_SCHEMAS.facebook_check_auth },
        { name: 'facebook_list_ad_accounts', description: 'List all Facebook ad accounts', inputSchema: TOOL_SCHEMAS.facebook_list_ad_accounts },
        { name: 'facebook_fetch_pagination_url', description: 'Fetch data from a pagination URL', inputSchema: TOOL_SCHEMAS.facebook_fetch_pagination_url },
        { name: 'facebook_get_details_of_ad_account', description: 'Get details of an ad account', inputSchema: TOOL_SCHEMAS.facebook_get_details_of_ad_account },
        { name: 'facebook_get_adaccount_insights', description: 'Get performance insights', inputSchema: TOOL_SCHEMAS.facebook_get_adaccount_insights },
        { name: 'facebook_get_activities_by_adaccount', description: 'Get activities by ad account', inputSchema: TOOL_SCHEMAS.facebook_get_activities_by_adaccount },
        { name: 'facebook_get_ad_creatives', description: 'Get creative assets for ads', inputSchema: TOOL_SCHEMAS.facebook_get_ad_creatives },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      // Example: If you want to use this.fetchWithAuth inside your tools, you could pass it or rewrite tools to accept it.
      switch (name) {
        // case 'facebook_login': return facebookLogin(args);
        // case 'facebook_logout': return facebookLogout(args);
        // case 'facebook_check_auth': return facebookCheckAuth(args, this.apiKey);
        case 'facebook_list_ad_accounts': return listAdAccounts(args, this.facebookAccessToken);
        case 'facebook_fetch_pagination_url': return fetchPaginationUrl(args, this.facebookAccessToken);
        case 'facebook_get_details_of_ad_account': return getAccountDetails(args, this.facebookAccessToken);
        case 'facebook_get_adaccount_insights': return getAccountInsights(args, this.facebookAccessToken);
        case 'facebook_get_activities_by_adaccount': return getAccountActivities(args, this.facebookAccessToken);
        case 'facebook_get_ad_creatives': return getAdCreatives(args, this.facebookAccessToken);
        default: throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const stdioTransport = new StdioServerTransport();
    await this.server.connect(stdioTransport);
    console.error('✅ Facebook Ads MCP server running on stdio');

    const app = express();
    app.use(bodyParser.json());
    app.use(cors({
      origin: process.env.TOKEN_API_BASE_URL || 'http://localhost:3000/'
    }));

    app.use(express.static('public'));

    app.get('/', (_req, res) => {
      res.send('👋 Welcome to Facebook Ads MCP server running');
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.error(`🌍 Facebook Ads MCP server running on http://localhost:${port}`);
    });
  }
}

// Read CLI args:
// Expected usage:
// node src/index.js "10xer MCP Server" "http://localhost:8000/mcp-api/sse" "your_jwt_api_key"
const [serverName, sseUrl, apiKey] = process.argv.slice(2);

const server = new FacebookAdsMCPServer({ serverName, sseUrl, apiKey });

server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});