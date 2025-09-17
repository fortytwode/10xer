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

import open from 'open';

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
      facebookAccessToken: null,
      user_id: null,
      currentFacebookAccessToken: null
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

    this.facebookAccessTokens = {}; // Example: { "user_id1": "token1", "user_id2": "token2" }
    this.user_id = null
    this.currentFacebookAccessToken = null

    // Initialize Express server for API endpoints
    this.apiServer = express();
    this.setupApiServer();
    this.setupMCPHandlers();
  }

  async fetchFacebookAccessToken(userId) {
    const url = `https://10xer-web-production.up.railway.app/mcp-api/facebook_token_by_user?userId=${userId}`;
    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch Facebook token: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.facebook_access_token) {
        this.currentFacebookAccessToken = data.facebook_access_token;
        console.error('✅ Facebook access token fetched:', this.currentFacebookAccessToken.slice(0, 10) + '...');
      } else {
        throw new Error('Token not present in response');
      }
    } catch (err) {
      console.error('❌ Error fetching Facebook token:', err.message);
      throw err;
    }
  }

  setupApiServer() {
    this.apiServer.use(cors());
    this.apiServer.use(express.json({ limit: '50mb' }));
    
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
      console.log('SSE test endpoint hit');
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
        console.log('SSE test client disconnected');
      });
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
        
        // Store transport by session ID for POST requests
        if (!this.sseTransports) {
          this.sseTransports = new Map();
        }
        this.sseTransports.set(sseTransport.sessionId, sseTransport);
        
        // Clean up when connection closes
        const originalOnClose = sseTransport.onclose;
        sseTransport.onclose = () => {
          this.sseTransports.delete(sseTransport.sessionId);
          if (originalOnClose) originalOnClose();
        };
        
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
        const sessionId = req.query.sessionId;
        if (!sessionId) {
          throw new Error('Session ID required in POST request');
        }
        
        if (!this.sseTransports || !this.sseTransports.has(sessionId)) {
          throw new Error('SSE connection not found for session');
        }
        
        const sseTransport = this.sseTransports.get(sessionId);
        await sseTransport.handlePostMessage(req, res);
      } catch (err) {
        console.error('SSE POST error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: `MCP POST failed: ${err.message}` });
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
            <p>Once logged in, click the button below to continue:</p>
            <form method="GET" action="/trigger-token-fetch">
              <button type="submit">✅ I'm Logged In – Continue</button>
            </form>
          </main>
        </body>
        </html>
      `);
    });

    // this.apiServer.get('/trigger-token-fetch', async (req, res) => {
    //   try {
    //     // Extract the session cookie from the incoming request headers
    //     const sessionCookie = req.headers.cookie
    //       ?.split(';')
    //       .map(c => c.trim())
    //       .find(c => c.startsWith('session='));

    //     if (!sessionCookie) {
    //       return res.status(401).send('<h2>❌ No session cookie found. Please log in first.</h2>');
    //     }

    //     console.log("sessionCookie->", sessionCookie);

    //     // Call the Facebook token API with the session cookie in the headers, using GET method
    //     const response = await fetch('https://10xer-web-production.up.railway.app/integrations/api/facebook/token', {
    //       method: 'GET',
    //       headers: {
    //         'Cookie': sessionCookie,  // Pass the session cookie here
    //       }
    //     });

    //     if (!response.ok) {
    //       throw new Error(`Token API responded with status ${response.status}`);
    //     }

    //     const data = await response.json();

    //     if (data && data.access_token) {
    //       this.facebookAccessToken = data.access_token;
    //       res.send('<h2>✅ Token fetched! You may now return to the app.</h2>');
    //     } else {
    //       res.status(500).send('<h2>❌ Token fetch failed. No access token returned.</h2>');
    //     }
    //   } catch (error) {
    //     console.error('Token fetch failed:', error);
    //     res.status(500).send(`<h2>❌ Error: ${error.message}</h2>`);
    //   }
    // });

    // POST: Save token for a specific user
    this.apiServer.post('/trigger-token-fetch', async (req, res) => {
      try {
        const { access_token, user_id } = req.body;

        if (!access_token || !user_id) {
          return res.status(400).send('<h2>❌ Missing access_token or user_id.</h2>');
        }

        console.log('✅ Received access token and user ID:', access_token, user_id);

        // Validate token by requesting MCP
        const response = await fetch('https://10xer-web-production.up.railway.app/integrations/api/facebook/token', {
          method: 'GET',
          headers: {
            'Authorization': access_token,
          }
        });

        if (!response.ok) {
          throw new Error(`Token API responded with status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.access_token) {
          // ✅ Save token per user_id
          this.facebookAccessTokens[user_id] = data.access_token;
          this.user_id = data.user_id

          res.send('<h2>✅ Token fetched and saved! You may now return to the app.</h2>');
        } else {
          res.status(500).send('<h2>❌ Token fetch failed. No access token returned.</h2>');
        }
      } catch (error) {
        console.error('❌ Error forwarding token:', error);
        return res.status(500).send(`<h2>❌ Error: ${error.message}</h2>`);
      }
    });

    this.apiServer.get('/save-trigger-token-fetch', (req, res) => {
      try {
        const user_id = req.query.user_id;

        if (user_id) {
          const token = this.facebookAccessTokens[user_id];

          if (token) {
            res.json({
              success: true,
              user_id,
              access_token: token
            });
          } else {
            res.status(404).json({
              success: false,
              message: 'No token found for given user_id'
            });
          }
        } else {
          // No user_id provided — return all tokens
          res.json({
            success: true,
            tokens: this.facebookAccessTokens
          });
        }
      } catch (error) {
        console.error('Error retrieving saved token(s):', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Claude.ai individual tool endpoints (REST API format)
    this.apiServer.post('/tools/facebook_list_ad_accounts', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_list_ad_accounts', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_details_of_ad_account', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_details_of_ad_account', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_adaccount_insights', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_adaccount_insights', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_ad_creatives', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_ad_creatives', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_activities_by_adaccount', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_activities_by_adaccount', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_campaign_details', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_campaign_details', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_adset_details', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_adset_details', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.apiServer.post('/tools/facebook_get_creative_asset_url_by_ad_id', async (req, res) => {
      try {
        const result = await this.executeToolCall({ toolName: 'facebook_get_creative_asset_url_by_ad_id', args: req.body });
        res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
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
    console.error("args->", args)
    console.error("args?.user_id->", args?.user_id)
    await this.fetchFacebookAccessToken(this.user_id)
    console.error("this.currentFacebookAccessToken->", this.currentFacebookAccessToken);
    // Step 2: tool switch
    switch (toolName) {
      // case 'facebook_login':
      //   return await facebookLogin(args);

      // case 'facebook_logout':
      // return await facebookLogout(args);

      // case 'facebook_check_auth':
      //   return await facebookCheckAuth(args);
      
      case 'facebook_list_ad_accounts':
        return await listAdAccounts(args, this.currentFacebookAccessToken);

      case 'facebook_fetch_pagination_url':
        return await fetchPaginationUrl(args, this.currentFacebookAccessToken);

      case 'facebook_get_details_of_ad_account':
        return await getAccountDetails(args, this.currentFacebookAccessToken);

      case 'facebook_get_adaccount_insights':
        return await getAccountInsights(args, this.currentFacebookAccessToken);

      case 'facebook_get_activities_by_adaccount':
        return await getAccountActivities(args, this.currentFacebookAccessToken);

      case 'facebook_get_ad_creatives':
        return await getAdCreatives(args, this.currentFacebookAccessToken);

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

  // async fetchFacebookAccessToken() {
  //   const integrationsUrl = 'https://10xer-web-production.up.railway.app/integrations/integrations';
  //   const loginUrl = 'https://10xer-web-production.up.railway.app/login';
  //   const tokenUrl = 'https://10xer-web-production.up.railway.app/api/facebook/token';

  //   try {
  //     // 1) Open the integrations URL in the default browser
  //     await open(integrationsUrl);

  //     // 2) Open the login URL in the default browser
  //     await open(loginUrl);

  //     // 3) Fetch the Facebook token now
  //     const tokenRes = await fetch(tokenUrl);
  //     if (!tokenRes.ok) {
  //       throw new Error(`Facebook token fetch failed: ${tokenRes.status}`);
  //     }

  //     const data = await tokenRes.json();

  //     if (data && data.success === true && typeof data.facebook_access_token === 'string') {
  //       this.facebookAccessToken = data.facebook_access_token;
  //       console.log('✅ Facebook access token fetched:', this.facebookAccessToken.slice(0, 10) + '...');
  //     } else {
  //       throw new Error('Facebook token not found or invalid in response');
  //     }
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  // async fetchFacebookAccessToken() {
  //   const helperUrl = 'https://10xer-production.up.railway.app/facebook-auth-helper';

  //   console.log('🧭 Opening Facebook auth helper page...');
  //   await open(helperUrl);

  //   // Instead of fetching the token immediately here, the user will do it via UI
  //   throw new Error('🔐 Facebook login required. Please complete login in the browser.');
  // }


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