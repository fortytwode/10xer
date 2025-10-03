#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';

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
import { TokenStorage } from './auth/token-storage.js';

import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';
import { CLAUDE_CONNECTOR_MANIFEST } from './claude-connector-manifest.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

class FacebookAdsMCPServer {
  constructor({ serverName, sseUrl, apiKey }) {
    this.serverName = serverName;
    this.sseUrl = sseUrl;
    this.apiKey = apiKey;

    this.apiBaseUrl = this.sseUrl.replace(/\/sse$/, '');
    this.facebookAccessToken = null;

    this.server = new Server({
      name: this.serverName || process.env.MCP_SERVER_NAME || 'facebook-ads-mcp',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
    }, {
      capabilities: { tools: {} },
    });

    this.setupToolHandlers();
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
    const app = express();

    app.use(bodyParser.json());
    app.use(cors());

    // Serve static files (manifest, etc.)
    app.use('/.well-known', express.static(path.join(__dirname, '../public/.well-known')));
    app.use(express.static(path.join(__dirname, '../public')));

    app.get('/', (_req, res) => {
      res.send('👋 Welcome to Facebook Ads MCP server');
    });

    // Claude tool endpoints
    app.get('/claude/manifest', (_req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    app.get('/claude/auth/status', (_req, res) => {
      const hasToken = !!this.facebookAccessToken;
      res.json({
        authenticated: hasToken,
        message: hasToken ? 'Facebook token available' : 'No Facebook token found',
      });
    });

    app.post('/claude/tools/:toolName', async (req, res) => {
      try {
        const toolName = req.params.toolName;
        const args = req.body || {};

        const toolMap = {
          'facebook_list_ad_accounts': listAdAccounts,
          'facebook_get_adaccount_insights': getAccountInsights,
          'facebook_get_ad_creatives': getAdCreatives,
          'facebook_get_details_of_ad_account': getAccountDetails,
          'facebook_get_activities_by_adaccount': getAccountActivities,
        };

        const toolFunc = toolMap[toolName];
        if (!toolFunc) {
          return res.status(404).json({ error: `Tool ${toolName} not found` });
        }

        const result = await toolFunc(args, this.facebookAccessToken);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ✅ Create raw HTTP server for SSE + Express
    const httpServer = http.createServer((req, res) => {
      if (req.url === '/mcp' && req.method === 'GET') {
        const sseTransport = new SSEServerTransport('/mcp', req, res);
        server.server.connect(sseTransport).catch(err => {
          console.error('SSE connection error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('MCP connection failed');
        });
      } else {
        app(req, res); // delegate to Express for other routes
      }
    });

    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log(`🌍 MCP server running at http://localhost:${port}`);
      console.log(`🔗 Claude manifest: http://localhost:${port}/.well-known/claude-manifest.json`);
      console.log(`🔗 SSE endpoint: http://localhost:${port}/mcp`);
    });
  }
}

// Read CLI args
const [serverName, sseUrl, apiKey] = process.argv.slice(2);

const server = new FacebookAdsMCPServer({ serverName, sseUrl, apiKey });

server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
