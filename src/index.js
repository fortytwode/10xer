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

import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';
import { CLAUDE_CONNECTOR_MANIFEST } from './claude-connector-manifest.js';

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

    // Claude Connector Endpoints
    app.get('/claude/manifest', (_req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    app.get('/claude/auth/status', (_req, res) => {
      const hasToken = this.facebookAccessToken ? true : false;
      res.json({ 
        authenticated: hasToken,
        message: hasToken ? 'Facebook token available' : 'No Facebook token found'
      });
    });

    app.post('/claude/tools/:toolName', async (req, res) => {
      try {
        const toolName = req.params.toolName;
        const args = req.body || {};
        
        // Map Claude tool names to MCP tool names
        const toolMap = {
          'facebook_list_ad_accounts': 'facebook_list_ad_accounts',
          'facebook_get_adaccount_insights': 'facebook_get_adaccount_insights', 
          'facebook_get_ad_creatives': 'facebook_get_ad_creatives',
          'facebook_get_details_of_ad_account': 'facebook_get_details_of_ad_account',
          'facebook_get_activities_by_adaccount': 'facebook_get_activities_by_adaccount'
        };

        const mcpToolName = toolMap[toolName];
        if (!mcpToolName) {
          return res.status(404).json({ error: `Tool ${toolName} not found` });
        }

        // Execute the MCP tool
        let result;
        switch (mcpToolName) {
          case 'facebook_list_ad_accounts': 
            result = await listAdAccounts(args, this.facebookAccessToken);
            break;
          case 'facebook_get_adaccount_insights': 
            result = await getAccountInsights(args, this.facebookAccessToken);
            break;
          case 'facebook_get_ad_creatives': 
            result = await getAdCreatives(args, this.facebookAccessToken);
            break;
          case 'facebook_get_details_of_ad_account': 
            result = await getAccountDetails(args, this.facebookAccessToken);
            break;
          case 'facebook_get_activities_by_adaccount': 
            result = await getAccountActivities(args, this.facebookAccessToken);
            break;
          default:
            throw new Error(`Unknown tool: ${mcpToolName}`);
        }

        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
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