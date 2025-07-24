#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import { getAdThumbnailsEmbedded } from './tools/get-ad-thumbnails-embedded.js';
import { facebookLogin } from './tools/facebook-login.js';
import { facebookLogout } from './tools/facebook-logout.js';
import { facebookCheckAuth } from './tools/facebook-check-auth.js';

// Import schemas
import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';

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
      gemini: new GeminiAdapter()
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

    // Initialize Express server for API endpoints
    this.apiServer = express();
    this.setupApiServer();
    this.setupMCPHandlers();
  }

  setupApiServer() {
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
  async executeToolCall({ toolName, args }) {
    switch (toolName) {
      case 'facebook_login':
        return await facebookLogin(args);

      case 'facebook_logout':
        return await facebookLogout(args);

      case 'facebook_check_auth':
        return await facebookCheckAuth(args);

      case 'facebook_list_ad_accounts':
        return await listAdAccounts(args);

      case 'facebook_fetch_pagination_url':
        return await fetchPaginationUrl(args);

      case 'facebook_get_details_of_ad_account':
        return await getAccountDetails(args);

      case 'facebook_get_adaccount_insights':
        return await getAccountInsights(args);

      case 'facebook_get_activities_by_adaccount':
        return await getAccountActivities(args);

      case 'facebook_get_ad_creatives':
        return await getAdCreatives(args);

      case 'facebook_get_ad_thumbnails':
        return await getAdThumbnailsEmbedded(args);

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

  async startMCP() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error('Facebook Ads MCP server running on stdio');
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