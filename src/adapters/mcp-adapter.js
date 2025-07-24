import { BaseAdapter } from './base-adapter.js';

/**
 * MCP (Model Context Protocol) adapter
 * Handles existing MCP format - keeps current behavior
 */
export class MCPAdapter extends BaseAdapter {
  constructor() {
    super('MCP');
  }

  parseRequest(request) {
    if (request.method === 'tools/call') {
      return {
        toolName: request.params.name,
        args: request.params.arguments || {}
      };
    }
    
    if (request.method === 'tools/list') {
      return {
        toolName: '_list_tools',
        args: {}
      };
    }

    throw new Error(`Unsupported MCP method: ${request.method}`);
  }

  formatResponse(result) {
    // MCP format is already correct, return as-is
    return result;
  }

  getToolDefinitions(toolSchemas) {
    // Convert MCP schemas to MCP tool list (already in correct format)
    return Object.entries(toolSchemas).map(([name, schema]) => ({
      name,
      description: this.getToolDescription(name),
      inputSchema: schema
    }));
  }

  getToolDescription(toolName) {
    const descriptions = {
      facebook_login: 'Login to Facebook using OAuth to authenticate and access ad accounts',
      facebook_logout: 'Logout from Facebook and clear stored credentials',
      facebook_check_auth: 'Check current Facebook authentication status and token validity',
      facebook_list_ad_accounts: 'List all Facebook ad accounts accessible with the provided credentials',
      facebook_fetch_pagination_url: 'Fetch data from a Facebook Graph API pagination URL',
      facebook_get_details_of_ad_account: 'Get details of a specific ad account as per the fields provided',
      facebook_get_adaccount_insights: 'Retrieves performance insights for a specified Facebook ad account',
      facebook_get_activities_by_adaccount: 'Retrieves activities for a Facebook ad account',
      facebook_get_ad_creatives: 'Get high-performing ad creatives with thumbnails and performance metrics',
      facebook_get_ad_thumbnails: 'Get thumbnails for specific Facebook ad IDs with multiple resolution options',
      facebook_get_ad_thumbnails_embedded: 'Get thumbnails with embedded images and caching for reliable cross-platform display'
    };
    return descriptions[toolName] || 'Facebook Ads tool';
  }

  formatError(error) {
    return {
      error: {
        code: -1,
        message: error.message
      }
    };
  }
}