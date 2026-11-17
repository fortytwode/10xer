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
// Import schemas
import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';
import { CLAUDE_CONNECTOR_MANIFEST } from './claude-connector-manifest.js';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { parseAccountBearer, getAccountFacebookToken } from './auth/account-key.js';

const NEW_CLAUDE_CONNECTOR_MANIFEST = createRequire(import.meta.url)('./claude-manifest.json');
import path from 'path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config({ path: new URL('../.env', import.meta.url) });

/**
 * Universal Facebook Ads Server
 * Supports MCP, OpenAI Function Calling, and Gemini Function Calling
 */
export class UniversalFacebookAdsServer {
  constructor() {
    this.adapters = {
      mcp: new MCPAdapter(),
      openai: new OpenAIAdapter(), 
      gemini: new GeminiAdapter(),
    };
    this.sseSessions = new Map();
    this.apiServer = express();
    this.setupApiServer();
  }

  createMcpServer(getAccountKey) {
    const server = new Server({
      name: process.env.MCP_SERVER_NAME || 'facebook-ads-universal',
      version: process.env.MCP_SERVER_VERSION || '2.0.0',
    }, { capabilities: { tools: {} } });
    const adapter = this.adapters.mcp;
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: adapter.getToolDefinitions(TOOL_SCHEMAS),
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const result = await this.executeToolCall(adapter.parseRequest(request), getAccountKey(extra));
      return adapter.formatResponse(result);
    });
    return server;
  }

  setupApiServer() {
    this.apiServer.use(cors());
    this.apiServer.use(express.json({ limit: '50mb' }));
    this.apiServer.use((req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    });

    // Root route
    this.apiServer.get('/', (req, res) => {
      res.json({
        name: 'Facebook Ads Universal Server',
        version: '2.0.0',
        status: 'running',
        endpoints: ['/health', '/mcp', '/tools', '/manifest.json']
      });
    });

    // Health check endpoint
    this.apiServer.get('/health', (req, res) => {
      res.json({ status: 'ok', protocols: ['mcp', 'openai', 'gemini'] });
    });

    // SSE test endpoint to verify Railway SSE support
    this.apiServer.get('/sse-test', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      res.write('data: Railway SSE test started\n\n');

      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        res.write(`data: SSE message ${counter} - ${new Date().toISOString()}\n\n`);

        if (counter >= 10) {
          clearInterval(interval);
          res.write('data: SSE test completed\n\n');
          res.end();
        }
      }, 2000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
    });

    // OpenAI Function Calling endpoints
    this.apiServer.post('/openai/functions', async (req, res) => {
      try {
        const adapter = this.adapters.openai;
        const normalized = adapter.parseRequest(req.body);
        const result = await this.executeToolCall(normalized, parseAccountBearer(req.get('Authorization')));
        const response = adapter.formatResponse(result, normalized.toolCallId);
        res.json(response);
      } catch (error) {
        res.status(error.status || 500).json(this.adapters.openai.formatError(error));
      }
    });

    // Get OpenAI function definitions
    this.apiServer.get('/openai/functions/definitions', (req, res) => {
      const definitions = this.adapters.openai.getToolDefinitions(TOOL_SCHEMAS);
      res.json({ functions: definitions });
    });

    // Standard manifest endpoints for Claude discovery
    this.apiServer.get('/.well-known/ai-plugin.json', (req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    this.apiServer.get('/.well-known/claude-manifest.json', (req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    this.apiServer.get('/manifest.json', (req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    // TESTING: Dynamic manifest endpoint for schema validation testing
    this.apiServer.get('/test-manifest/:variant', (req, res) => {
      const variant = req.params.variant;
      const testManifests = this.getTestManifests();

      if (testManifests[variant]) {
        res.json(testManifests[variant]);
      } else {
        res.status(404).json({
          error: 'Test variant not found',
          available: Object.keys(testManifests)
        });
      }
    });

    // TESTING: Handle MCP requests to manifest URLs (Claude.ai does this)
    this.apiServer.post('/test-manifest/:variant', async (req, res) => {
      try {
        // Handle MCP protocol on manifest endpoint
        const message = req.body;

        if (message.method === 'initialize') {
          res.json({
            jsonrpc: "2.0",
            id: message.id,
            result: {
              protocolVersion: "2025-06-18",
              capabilities: { tools: {} },
              serverInfo: { name: "facebook-ads-test", version: "1.0.0" }
            }
          });
        } else if (message.method === 'tools/list') {
          const tools = this.adapters.mcp.getToolDefinitions(TOOL_SCHEMAS);
          res.json({
            jsonrpc: "2.0",
            id: message.id,
            result: { tools }
          });
        } else if (message.method === 'tools/call') {
          const result = await this.executeToolCall({
            toolName: message.params.name,
            args: message.params.arguments || {},
          }, parseAccountBearer(req.get('Authorization')));
          res.json({
            jsonrpc: "2.0",
            id: message.id,
            result: result
          });
        } else {
          res.json({
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32601, message: `Method not found: ${message.method}` }
          });
        }
      } catch (error) {
        res.status(error.status || 500).json({
          jsonrpc: "2.0",
          id: req.body.id || 0,
          error: { code: -32603, message: error.message }
        });
      }
    });

    this.apiServer.use('/.well-known', express.static(path.join(__dirname, '../public/.well-known')));
    this.apiServer.use(express.static(path.join(__dirname, '../public')));

    // Claude tool endpoints
    this.apiServer.get('/claude/manifest', (_req, res) => {
      res.json(CLAUDE_CONNECTOR_MANIFEST);
    });

    this.apiServer.get('/claude-manifest', (_req, res) => {
      res.json(NEW_CLAUDE_CONNECTOR_MANIFEST);
    });

    // Gemini Function Calling endpoints  
    this.apiServer.post('/gemini/functions', async (req, res) => {
      try {
        const adapter = this.adapters.gemini;
        const normalized = adapter.parseRequest(req.body);
        const result = await this.executeToolCall(normalized, parseAccountBearer(req.get('Authorization')));
        const response = adapter.formatResponse(result);
        res.json(response);
      } catch (error) {
        res.status(error.status || 500).json(this.adapters.gemini.formatError(error));
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

    // Each native SSE connection has its own MCP Server and owner-bound message endpoint.
    for (const endpoint of ['/mcp', '/mcp/sse']) {
      this.apiServer.get(endpoint, async (req, res) => {
        let transport;
        try {
          const key = parseAccountBearer(req.get('Authorization'));
          await getAccountFacebookToken(key);
          if (res.destroyed) return;
          transport = new SSEServerTransport(endpoint, res);
          const owner = createHash('sha256').update(key).digest('hex');
          this.sseSessions.set(transport.sessionId, { owner, endpoint, transport });
          res.once('close', () => this.sseSessions.delete(transport.sessionId));
          const server = this.createMcpServer(extra => extra.authInfo?.token);
          await server.connect(transport);
        } catch (error) {
          if (transport) this.sseSessions.delete(transport.sessionId);
          if (res.headersSent) return res.end();
          res.status(error.status || 500).json({ error: error.status ? error.message : 'MCP connection failed' });
        }
      });

      this.apiServer.post(endpoint, async (req, res, next) => {
        if (!Object.hasOwn(req.query, 'sessionId') && endpoint === '/mcp') return next();
        try {
          const key = parseAccountBearer(req.get('Authorization'));
          const session = this.sseSessions.get(req.query.sessionId);
          const owner = createHash('sha256').update(key).digest('hex');
          if (!session || session.owner !== owner || session.endpoint !== endpoint) {
            return res.status(404).json({ error: 'Unknown MCP session' });
          }
          req.auth = { token: key };
          await session.transport.handlePostMessage(req, res, req.body);
        } catch (error) {
          if (!res.headersSent) res.status(error.status || 500).json({ error: error.status ? error.message : 'MCP message failed' });
        }
      });
    }

    this.apiServer.post('/mcp', async (req, res) => {
      try {
        // Handle MCP requests directly via HTTP (no SSE needed)
        const request = req.body;

        if (request.method === 'initialize') {
          res.json({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              protocolVersion: "2025-06-18",
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: "facebook-ads-universal",
                version: "2.0.0"
              }
            }
          });
        } else if (request.method === 'notifications/initialized') {
          // Claude.ai sends this after initialization - acknowledge it
          res.status(200).end();
        } else if (request.method === 'tools/list') {
          const tools = this.adapters.mcp.getToolDefinitions(TOOL_SCHEMAS);
          res.json({
            jsonrpc: "2.0",
            id: request.id,
            result: { tools }
          });
        } else if (request.method === 'tools/call') {
          const result = await this.executeToolCall({
            toolName: request.params.name,
            args: request.params.arguments || {},
          }, parseAccountBearer(req.get('Authorization')));
          res.json({
            jsonrpc: "2.0",
            id: request.id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
        } else {
          res.status(400).json({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32601, message: "Method not found" }
          });
        }
      } catch (err) {
        res.status(err.status || 500).json({
          jsonrpc: "2.0",
          id: req.body?.id,
          error: { code: -32603, message: err.message }
        });
      }
    });

    // MCP GET endpoint for SSE connection (Claude.ai expects this)
    this.apiServer.post('/tools/:name', async (req, res) => {
      try {
        const key = parseAccountBearer(req.get('Authorization'));
        const result = await this.executeToolCall({ toolName: req.params.name, args: req.body }, key);
        res.json(result);
      } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
      }
    });

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

    // Facebook OAuth endpoint (the one referenced in start-auth)
    this.apiServer.get('/auth/facebook', (req, res) => {
      // For now, redirect to the auth helper page
      res.redirect('/facebook-auth-helper');
    });

    this.apiServer.get('/facebook-auth-helper', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Facebook Login Required</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
                Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              background: #f7f9fc;
              color: #333;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            main {
              background: white;
              padding: 2.5rem 3rem;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              max-width: 400px;
              width: 90%;
              text-align: center;
            }
            h1 {
              font-size: 1.8rem;
              margin-bottom: 1rem;
            }
            p {
              font-size: 1rem;
              margin: 1rem 0;
              line-height: 1.5;
            }
            a {
              color: #1877f2; /* Facebook Blue */
              text-decoration: none;
              font-weight: 600;
            }
            a:hover {
              text-decoration: underline;
            }
            button {
              margin-top: 1.8rem;
              background-color: #1877f2;
              color: white;
              font-size: 1rem;
              padding: 0.75rem 1.6rem;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              transition: background-color 0.3s ease;
              box-shadow: 0 4px 8px rgba(24, 119, 242, 0.4);
            }
            button:hover {
              background-color: #145dbf;
            }
            .emoji {
              font-size: 2.5rem;
              margin-bottom: 0.6rem;
              user-select: none;
            }
          </style>
        </head>
        <body>
          <main>
            <div class="emoji">🔐</div>
            <h1>Facebook Login Required</h1>
            <p>
              Step 1: <a href="https://10xer-web-production.up.railway.app/login" target="_blank" rel="noopener noreferrer">Login to 10xer</a>
            </p>
            <p>
              Step 2: <a href="https://10xer-web-production.up.railway.app/integrations/integrations" target="_blank" rel="noopener noreferrer">Visit the Integrations Page</a>
            </p>
            <p>Connect Facebook in Integrations. Configure your MCP client with your 10xer dashboard API key.</p>
          </main>
        </body>
        </html>
      `);
    });

    // Browser enrollment now stays in the signed-in web app.
    this.apiServer.all(['/trigger-token-fetch', '/save-trigger-token-fetch', '/getSession'], (_req, res) => {
      res.status(410).json({ message: 'Manage the Facebook connection through your 10xer Integrations page.' });
    });

  }

  getTestManifests() {
    const baseManifest = {
      name: "10xer-test",
      description: "Test manifest for schema validation",
      version: "1.0.0",
      api: {
        base_url: "https://10xer-production.up.railway.app"
      }
    };

    const simpleTool = {
      name: "facebook_login",
      description: "Login to Facebook using OAuth to authenticate and access ad accounts",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    };

    return {
      // Test 1: Current format (baseline)
      current: {
        ...baseManifest,
        connection: { type: "none" },
        tools: [{
          ...simpleTool,
          method: "POST",
          endpoint: "/tools/facebook_login"
        }]
      },

      // Test 2: MCP standard format (no method/endpoint)
      mcp: {
        ...baseManifest,
        connection: { type: "none" },
        tools: [simpleTool]
      },

      // Test 3: Add additionalProperties to schema
      strict: {
        ...baseManifest,
        connection: { type: "none" },
        tools: [{
          ...simpleTool,
          method: "POST",
          endpoint: "/tools/facebook_login",
          inputSchema: {
            ...simpleTool.inputSchema,
            additionalProperties: false
          }
        }]
      },

      // Test 4: OAuth connection type
      oauth: {
        ...baseManifest,
        connection: { type: "oauth2" },
        tools: [{
          ...simpleTool,
          method: "POST",
          endpoint: "/tools/facebook_login"
        }]
      },

      // Test 5: Add protocol version
      versioned: {
        ...baseManifest,
        protocol_version: "2025-06-18",
        connection: { type: "none" },
        tools: [{
          ...simpleTool,
          method: "POST",
          endpoint: "/tools/facebook_login"
        }]
      },

      // Test 6: Minimal valid schema
      minimal: {
        name: "test",
        version: "1.0.0",
        tools: [{
          name: "simple_test",
          description: "Simple test",
          inputSchema: { type: "object" }
        }]
      }
    };
  }

  async executeToolCall({ toolName, args }, accountKey) {
    const token = await getAccountFacebookToken(accountKey);
    switch (toolName) {
      case 'facebook_list_ad_accounts':
        return await listAdAccounts(args, token);

      case 'facebook_fetch_pagination_url':
        return await fetchPaginationUrl(args, token);

      case 'facebook_get_details_of_ad_account':
        return await getAccountDetails(args, token);

      case 'facebook_get_adaccount_insights':
        return await getAccountInsights(args, token);

      case 'facebook_get_activities_by_adaccount':
        return await getAccountActivities(args, token);

      case 'facebook_get_ad_creatives':
        return await getAdCreatives(args, token);

      case 'facebook_get_ad_thumbnails':
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

  async startMCP() {
    try {
      console.error('Connecting MCP server via stdio');

      const transport = new StdioServerTransport();
      await this.createMcpServer(() => process.env.API_KEY).connect(transport);

      console.error('MCP server connected on stdio');

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
if (process.argv[1] && realpathSync(process.argv[1]) === __filename) {
  const server = new UniversalFacebookAdsServer();
  server.start().catch(() => {
    console.error('Failed to start universal server');
    process.exitCode = 1;
  });
}
