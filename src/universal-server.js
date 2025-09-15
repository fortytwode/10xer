#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import adapters
import { MCPAdapter } from './adapters/mcp-adapter.js';
import { OpenAIAdapter } from './adapters/openai-adapter.js';
import { GeminiAdapter } from './adapters/gemini-adapter.js';

// Import all existing tool handlers (unchanged!)
import { listAdAccounts } from './tools/list-ad-accounts.js';
import { fetchPaginationUrl } from './tools/fetch-pagination.js';
import { getAccountDetails } from './tools/get-account-details.js';
import { getAccountInsights } from './tools/get-account-insights.js';
import { getAccountActivities } from './tools/get-account-activities.js';
import { getAdCreatives } from './tools/get-ad-creatives.js';
// import { getAdThumbnailsEmbedded } from './tools/get-ad-thumbnails-embedded.js';
import { facebookLogin } from './tools/facebook-login.js';
import { facebookLogout } from './tools/facebook-logout.js';
import { facebookCheckAuth } from './tools/facebook-check-auth.js';

// Import schemas
import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';
import { CLAUDE_CONNECTOR_MANIFEST } from './claude-connector-manifest.js';
import path from 'path';
import { fileURLToPath } from 'url';

import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config({ path: new URL('../.env', import.meta.url) });

/**
 * Universal Facebook Ads Server
 * Supports MCP, OpenAI Function Calling, and Gemini Function Calling
 */
class UniversalFacebookAdsServer {
  constructor() {
    this.adapters = {
      mcp: new MCPAdapter(),
      openai: new OpenAIAdapter(), 
      gemini: new GeminiAdapter(),
      facebookAccessToken: null
    };

    // Initialize MCP server (existing functionality)
    this.mcpServer = new Server({
      name: process.env.MCP_SERVER_NAME || 'facebook-ads-universal',
      version: process.env.MCP_SERVER_VERSION || '2.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.facebookAccessToken = null;

    // Initialize Express server for API endpoints
    this.apiServer = express();
    this.setupApiServer();
    this.setupMCPHandlers();
  }

  setupApiServer() {
    this.apiServer.get('/mcp', async (req, res) => {
      try {
        this.activeSseTransport = new SSEServerTransport('/mcp', res);
        await this.mcpServer.connect(this.activeSseTransport);
      } catch (err) {
        console.error('SSE connection error:', err);
        if (!res.headersSent) {
          res.status(500).send('MCP connection failed');
        }
      }
    });

    this.apiServer.post('/mcp', async (req, res) => {
      try {
        if (!this.activeSseTransport) {
          throw new Error('SSE connection not established');
        }
        await this.activeSseTransport.handlePostMessage(req, res);
      } catch (err) {
        console.error('SSE POST error:', err);
        if (!res.headersSent) {
          res.status(500).send('MCP POST failed');
        }
      }
    });
    this.apiServer.use(cors());
    this.apiServer.use(express.json({ limit: '50mb' }));
    
    // Health check endpoint
    this.apiServer.get('/health', (req, res) => {
      res.json({ status: 'ok', protocols: ['mcp', 'openai', 'gemini'] });
    });

    // OpenAI Function Calling endpoints
    this.apiServer.post('/openai/functions', async (req, res) => {
      try {
        const adapter = this.adapters.openai;
        const normalized = adapter.parseRequest(req.body);
        const result = await this.executeToolCall(normalized);
        const response = adapter.formatResponse(result, normalized.toolCallId);
        res.json(response);
      } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json(this.adapters.openai.formatError(error));
      }
    });

    // Get OpenAI function definitions
    this.apiServer.get('/openai/functions/definitions', (req, res) => {
      const definitions = this.adapters.openai.getToolDefinitions(TOOL_SCHEMAS);
      res.json({ functions: definitions });
    });

    this.apiServer.use('/.well-known', express.static(path.join(__dirname, '../public/.well-known')));
    this.apiServer.use(express.static(path.join(__dirname, '../public')));
    
    // Claude tool endpoints
    this.apiServer.get('/claude/manifest', (_req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    // Gemini Function Calling endpoints  
    this.apiServer.post('/gemini/functions', async (req, res) => {
      try {
        const adapter = this.adapters.gemini;
        const normalized = adapter.parseRequest(req.body);
        const result = await this.executeToolCall(normalized);
        const response = adapter.formatResponse(result);
        res.json(response);
      } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json(this.adapters.gemini.formatError(error));
      }
    });

    // Get Gemini function definitions
    this.apiServer.get('/gemini/functions/definitions', (req, res) => {
      const definitions = this.adapters.gemini.getToolDefinitions(TOOL_SCHEMAS);
      res.json({ functions: definitions });
    });

    // List all available tools (generic endpoint)
    this.apiServer.get('/tools', (req, res) => {
      const tools = Object.keys(TOOL_SCHEMAS).map(name => ({
        name,
        description: this.adapters.mcp.getToolDescription(name)
      }));
      res.json({ tools });
    });

    // MCP SSE endpoints for Claude connector
    this.apiServer.get('/mcp', async (req, res) => {
      try {
        const sseTransport = new SSEServerTransport('/mcp', res);
        await this.mcpServer.connect(sseTransport);
      } catch (err) {
        console.error('SSE connection error:', err);
        if (!res.headersSent) {
          res.status(500).send('MCP connection failed');
        }
      }
    });

    this.apiServer.post('/mcp', async (req, res) => {
      try {
        const sseTransport = new SSEServerTransport('/mcp', res);
        await sseTransport.handlePostMessage(req, res);
      } catch (err) {
        console.error('SSE POST error:', err);
        if (!res.headersSent) {
          res.status(500).send('MCP POST failed');
        }
      }
    });

    // Claude OAuth endpoints
    this.apiServer.get('/mcp/start-auth/', (req, res) => {
      // For now, indicate that authentication is handled via tools
      res.json({
        auth_url: `${process.env.DEPLOYED_URL || 'https://10xer-production.up.railway.app'}/auth/facebook`,
        type: "oauth2"
      });
    });

    this.apiServer.get('/mcp/auth-status/', (req, res) => {
      // Return authentication status - will be checked via facebook_check_auth tool
      res.json({
        authenticated: false,
        message: "Use facebook_check_auth tool to verify authentication status"
      });
    });
  }

  setupMCPHandlers() {
    // Existing MCP handlers (unchanged)
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.adapters.mcp.getToolDefinitions(TOOL_SCHEMAS)
      };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const adapter = this.adapters.mcp;
        const normalized = adapter.parseRequest(request);
        const result = await this.executeToolCall(normalized);
        return adapter.formatResponse(result);
      } catch (error) {
        console.error(`MCP Error in tool ${request.params.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Execute tool call - REUSES ALL EXISTING LOGIC!
   * This is the core function that all protocols use
   */
  // async executeToolCall({ toolName, args }) {
  //   switch (toolName) {
  //     case 'facebook_login':
  //       return await facebookLogin(args);

  //     case 'facebook_logout':
  //       return await facebookLogout(args);

  //     case 'facebook_check_auth':
  //       return await facebookCheckAuth(args);

  //     case 'facebook_list_ad_accounts':
  //       return await listAdAccounts(args, this.facebookAccessToken);

  //     case 'facebook_fetch_pagination_url':
  //       return await fetchPaginationUrl(args, this.facebookAccessToken);

  //     case 'facebook_get_details_of_ad_account':
  //       return await getAccountDetails(args, this.facebookAccessToken);

  //     case 'facebook_get_adaccount_insights':
  //       return await getAccountInsights(args, this.facebookAccessToken);

  //     case 'facebook_get_activities_by_adaccount':
  //       return await getAccountActivities(args, this.facebookAccessToken);

  //     case 'facebook_get_ad_creatives':
  //       return await getAdCreatives(args, this.facebookAccessToken);

  //     case 'facebook_get_ad_thumbnails':
  //       // return await getAdThumbnailsEmbedded(args);
  //       throw new Error('get_ad_thumbnails_embedded tool is temporarily disabled');

  //     case '_list_tools':
  //       return {
  //         content: [{
  //           type: 'text',
  //           text: JSON.stringify(Object.keys(TOOL_SCHEMAS), null, 2)
  //         }]
  //       };

  //     default:
  //       throw new Error(`Unknown tool: ${toolName}`);
  //   }
  // }

  async executeToolCall({ toolName, args }) {

    // Step 1: fetch token before the switch if needed
    if (toolName.startsWith('facebook_') && toolName !== 'facebook_login' && toolName !== 'facebook_logout' && toolName !== 'facebook_check_auth') {
      await this.fetchFacebookAccessToken();
      if (!this.facebookAccessToken) {
        throw new Error('Facebook access token not found after fetch');
      }
    }
    switch (toolName) {
      case 'facebook_login':
        return await facebookLogin(args);

      case 'facebook_logout':
        return await facebookLogout(args);

      case 'facebook_check_auth':
        return await facebookCheckAuth(args);

      case 'facebook_list_ad_accounts':
        return await listAdAccounts(args, this.facebookAccessToken);

      case 'facebook_fetch_pagination_url':
        return await fetchPaginationUrl(args, this.facebookAccessToken);

      case 'facebook_get_details_of_ad_account':
        return await getAccountDetails(args, this.facebookAccessToken);

      case 'facebook_get_adaccount_insights':
        return await getAccountInsights(args, this.facebookAccessToken);

      case 'facebook_get_activities_by_adaccount':
        return await getAccountActivities(args, this.facebookAccessToken);

      case 'facebook_get_ad_creatives':
        return await getAdCreatives(args, this.facebookAccessToken);

      case 'facebook_get_ad_thumbnails':
        // return await getAdThumbnailsEmbedded(args);
        throw new Error('get_ad_thumbnails_embedded tool is temporarily disabled');

      case '_list_tools':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(Object.keys(TOOL_SCHEMAS), null, 2)
          }]
        };

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async fetchFacebookAccessToken() {
    const integrationsUrl = 'https://10xer-web-production.up.railway.app/integrations/integrations';
    const loginUrl = 'https://10xer-web-production.up.railway.app/login';
    const tokenUrl = 'https://10xer-web-production.up.railway.app/api/facebook/token';

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 1) Open integrations URL
      const response = await page.goto(integrationsUrl, { waitUntil: 'networkidle2' });

      // 2) If not logged in (e.g. redirected to login page), navigate to login URL
      if (response.url() === loginUrl) {
        console.log('Not logged in, please login manually or automate login here');

        // Optional: automate login here if you have credentials & selectors
        // await page.type('input#username', 'your-username');
        // await page.type('input#password', 'your-password');
        // await page.click('button#login');
        // await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // 3) Extract session cookies
      const cookies = await page.cookies();
      const sessionCookie = cookies.find(cookie => cookie.name === 'session');

      if (!sessionCookie) {
        throw new Error('Session cookie not found. Please login first.');
      }

      // 4) Use fetch to call token API with the session cookie attached
      const tokenResponse = await fetch(tokenUrl, {
        headers: {
          Cookie: `session=${sessionCookie.value}`,
        },
      });

      if (!tokenResponse.ok) {
        throw new Error(`Facebook token fetch failed: ${tokenResponse.status}`);
      }

      const data = await tokenResponse.json();

      if (data && data.success === true && typeof data.facebook_access_token === 'string') {
        console.log('✅ Facebook access token fetched:', data.facebook_access_token.slice(0, 10) + '...');
        await browser.close();
        return data.facebook_access_token;
      } else {
        throw new Error('Facebook token not found or invalid in response');
      }
    } catch (err) {
      await browser.close();
      throw err;
    }
  }


  // async startMCP() {
  //   const transport = new StdioServerTransport();
  //   await this.mcpServer.connect(transport);
  //   console.error('Facebook Ads MCP server running on stdio');
  // }

  async startMCP() {
    try {
      console.log('🔄 Connecting MCP server via stdio...');

      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);

      console.log('✅ MCP server connected on stdio');

    } catch (err) {
      console.error('❌ Failed during MCP startup:', err.message);
      throw err;
    }
  }

  startAPI(port = 3003) {
    this.apiServer.listen(port, () => {
      console.error(`Facebook Ads API server running on port ${port}`);
      console.error(`OpenAI Functions: http://localhost:${port}/openai/functions`);
      console.error(`Gemini Functions: http://localhost:${port}/gemini/functions`);
    });
  }

  async start() {
    const mode = process.env.SERVER_MODE || 'mcp';
    
    if (mode === 'api') {
      const port = parseInt(process.env.PORT || '3003');
      this.startAPI(port);
    } else if (mode === 'both') {
      const port = parseInt(process.env.PORT || '3003');
      this.startAPI(port);
      await this.startMCP();
    } else {
      // Default MCP mode for backward compatibility
      await this.startMCP();
    }
  }
}

// Handle process errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const server = new UniversalFacebookAdsServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});