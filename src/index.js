#!/usr/bin/env node

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
import { facebookLogin } from './tools/facebook-login.js';
import { facebookLogout } from './tools/facebook-logout.js';
import { facebookCheckAuth } from './tools/facebook-check-auth.js';

import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

import { getFacebookTokenFromCLI } from './utils/cli-args.js';
import { TokenStorage } from './auth/token-storage.js';

class FacebookAdsMCPServer {
  constructor() {
    this.server = new Server({
      name: process.env.MCP_SERVER_NAME || 'facebook-ads-mcp',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
    }, {
      capabilities: { tools: {} },
    });

    this.setupToolHandlers();

    // Auto-store CLI token
    const { token, expiresIn } = getFacebookTokenFromCLI();
    if (token) {
      TokenStorage.storeToken(token, expiresIn)
        .then(() => console.error('✅ CLI Facebook token stored on startup'))
        .catch((err) => console.error('❌ Failed to store CLI token on startup:', err.message));
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'facebook_login', description: 'Login to Facebook', inputSchema: TOOL_SCHEMAS.facebook_login },
        { name: 'facebook_logout', description: 'Logout from Facebook', inputSchema: TOOL_SCHEMAS.facebook_logout },
        { name: 'facebook_check_auth', description: 'Check Facebook auth status', inputSchema: TOOL_SCHEMAS.facebook_check_auth },
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
      switch (name) {
        case 'facebook_login': return facebookLogin(args);
        case 'facebook_logout': return facebookLogout(args);
        case 'facebook_check_auth': return facebookCheckAuth(args);
        case 'facebook_list_ad_accounts': return listAdAccounts(args);
        case 'facebook_fetch_pagination_url': return fetchPaginationUrl(args);
        case 'facebook_get_details_of_ad_account': return getAccountDetails(args);
        case 'facebook_get_adaccount_insights': return getAccountInsights(args);
        case 'facebook_get_activities_by_adaccount': return getAccountActivities(args);
        case 'facebook_get_ad_creatives': return getAdCreatives(args);
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
    app.use(cors());

    app.use(express.static('public'));

    app.get('/', (_req, res) => {
      res.send('👋 Welcome to Facebook Ads MCP server running');
    });

    app.get('/health', (_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/tools', async (_req, res) => {
      const result = await this.server.request(ListToolsRequestSchema, {});
      res.json(result);
    });

    app.post('/tool', async (req, res) => {
      try {
        const result = await this.server.request(CallToolRequestSchema, {
          name: req.body.name,
          arguments: req.body.arguments,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ✅ New API: accept Facebook token from frontend
    app.post('/auth/token', async (req, res) => {
      try {
        const { accessToken, expiresIn } = req.body;
        if (!accessToken) {
          return res.status(400).json({ error: 'Missing accessToken' });
        }
        await TokenStorage.storeToken(accessToken, expiresIn);
        res.json({ success: true, message: 'Token stored successfully' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/auth/token-info', async (_req, res) => {
      const info = await TokenStorage.getTokenInfo();
      res.json(info);
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.error(`🌍 Facebook Ads MCP server running on http://localhost:${port}`);
    });
  }
}

const server = new FacebookAdsMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
