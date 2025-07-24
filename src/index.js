#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Import tool handlers
import { listAdAccounts } from './tools/list-ad-accounts.js';
import { fetchPaginationUrl } from './tools/fetch-pagination.js';
import { getAccountDetails } from './tools/get-account-details.js';
import { getAccountInsights } from './tools/get-account-insights.js';
import { getAccountActivities } from './tools/get-account-activities.js';
import { getAdCreatives } from './tools/get-ad-creatives.js';
import { facebookLogin } from './tools/facebook-login.js';
import { facebookLogout } from './tools/facebook-logout.js';
import { facebookCheckAuth } from './tools/facebook-check-auth.js';

// Import schemas
import { TOOL_SCHEMAS } from './schemas/tool-schemas.js';

// Load environment variables
dotenv.config({ path: new URL('../.env', import.meta.url) });

class FacebookAdsMCPServer {
  constructor() {
    this.server = new Server({
      name: process.env.MCP_SERVER_NAME || 'facebook-ads-mcp',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'facebook_login',
            description: 'Login to Facebook using OAuth to authenticate and access ad accounts',
            inputSchema: TOOL_SCHEMAS.facebook_login,
          },
          {
            name: 'facebook_logout',
            description: 'Logout from Facebook and clear stored credentials',
            inputSchema: TOOL_SCHEMAS.facebook_logout,
          },
          {
            name: 'facebook_check_auth',
            description: 'Check current Facebook authentication status and token validity',
            inputSchema: TOOL_SCHEMAS.facebook_check_auth,
          },
          {
            name: 'facebook_list_ad_accounts',
            description: 'List all Facebook ad accounts accessible with the provided credentials',
            inputSchema: TOOL_SCHEMAS.facebook_list_ad_accounts,
          },
          {
            name: 'facebook_fetch_pagination_url',
            description: 'Fetch data from a Facebook Graph API pagination URL',
            inputSchema: TOOL_SCHEMAS.facebook_fetch_pagination_url,
          },
          {
            name: 'facebook_get_details_of_ad_account',
            description: 'Get details of a specific ad account as per the fields provided',
            inputSchema: TOOL_SCHEMAS.facebook_get_details_of_ad_account,
          },
          {
            name: 'facebook_get_adaccount_insights',
            description: 'Retrieves performance insights for a specified Facebook ad account',
            inputSchema: TOOL_SCHEMAS.facebook_get_adaccount_insights,
          },
          {
            name: 'facebook_get_activities_by_adaccount',
            description: 'Retrieves activities for a Facebook ad account',
            inputSchema: TOOL_SCHEMAS.facebook_get_activities_by_adaccount,
          },
          {
            name: 'facebook_get_ad_creatives',
            description: 'Get creative assets (images, headlines, body text) for specific ad IDs',
            inputSchema: TOOL_SCHEMAS.facebook_get_ad_creatives,
          },
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
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

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log to stderr so it doesn't interfere with MCP protocol
    console.error('Facebook Ads MCP server running on stdio');
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
const server = new FacebookAdsMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});