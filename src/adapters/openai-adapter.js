import { BaseAdapter } from './base-adapter.js';

/**
 * OpenAI Function Calling adapter
 * Converts between OpenAI function call format and our internal format
 */
export class OpenAIAdapter extends BaseAdapter {
  constructor() {
    super('OpenAI');
  }

  parseRequest(request) {
    // OpenAI sends function calls in this format:
    // { function_call: { name: "tool_name", arguments: "{\"param\":\"value\"}" } }
    
    if (request.function_call) {
      const args = typeof request.function_call.arguments === 'string' 
        ? JSON.parse(request.function_call.arguments)
        : request.function_call.arguments;
        
      return {
        toolName: request.function_call.name,
        args: args
      };
    }

    // Handle tool calls array format (newer OpenAI API)
    if (request.tool_calls && request.tool_calls.length > 0) {
      const toolCall = request.tool_calls[0]; // Take first tool call
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

      return {
        toolName: toolCall.function.name,
        args: args,
        toolCallId: toolCall.id
      };
    }

    throw new Error('Invalid OpenAI function call format');
  }

  formatResponse(result, toolCallId) {
    // Convert MCP content to OpenAI-friendly format
    let content = '';
    const images = [];

    if (result.content) {
      for (const item of result.content) {
        if (item.type === 'text') {
          content += item.text + '\n';
        } else if (item.type === 'image') {
          // OpenAI handles images differently - can include them inline
          if (item.data && item.mimeType) {
            // Convert base64 to data URL for OpenAI
            const dataUrl = `data:${item.mimeType};base64,${item.data}`;
            images.push({
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'auto'
              }
            });
          }
        }
      }
    } else if (typeof result === 'string') {
      content = result;
    } else {
      content = JSON.stringify(result, null, 2);
    }

    // OpenAI function response format
    const response = {
      role: 'function',
      content: content.trim()
    };

    // If we have a tool call ID (newer format)
    if (toolCallId) {
      response.tool_call_id = toolCallId;
    }

    // Include images in the response if any
    if (images.length > 0) {
      // For OpenAI, we can include images in a separate message
      return [
        response,
        {
          role: 'assistant', 
          content: [
            { type: 'text', text: 'Here are the retrieved thumbnails:' },
            ...images
          ]
        }
      ];
    }

    return response;
  }

  getToolDefinitions(toolSchemas) {
    // Convert MCP schemas to OpenAI function definitions
    return Object.entries(toolSchemas).map(([name, schema]) => ({
      type: 'function',
      function: {
        name: name,
        description: this.getToolDescription(name),
        parameters: this.convertSchemaToOpenAI(schema)
      }
    }));
  }

  convertSchemaToOpenAI(mcpSchema) {
    // Convert MCP JSON schema to OpenAI function parameters format
    const converted = {
      type: 'object',
      properties: {},
      required: mcpSchema.required || []
    };

    if (mcpSchema.properties) {
      for (const [key, prop] of Object.entries(mcpSchema.properties)) {
        converted.properties[key] = {
          type: prop.type,
          description: prop.description
        };

        // Handle arrays
        if (prop.type === 'array' && prop.items) {
          converted.properties[key].items = prop.items;
        }

        // Handle enums
        if (prop.enum) {
          converted.properties[key].enum = prop.enum;
        }

        // Handle objects
        if (prop.type === 'object' && prop.properties) {
          converted.properties[key].properties = prop.properties;
        }
      }
    }

    return converted;
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
      role: 'function',
      content: `Error: ${error.message}`
    };
  }
}