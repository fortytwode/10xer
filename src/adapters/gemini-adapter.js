import { BaseAdapter } from './base-adapter.js';

/**
 * Google Gemini Function Calling adapter
 * Converts between Gemini function call format and our internal format
 */
export class GeminiAdapter extends BaseAdapter {
  constructor() {
    super('Gemini');
  }

  parseRequest(request) {
    // Gemini sends function calls in this format:
    // { function_call: { name: "tool_name", args: { param: "value" } } }
    
    if (request.function_call) {
      return {
        toolName: request.function_call.name,
        args: request.function_call.args || {}
      };
    }

    // Handle parts array format
    if (request.parts) {
      for (const part of request.parts) {
        if (part.function_call) {
          return {
            toolName: part.function_call.name,
            args: part.function_call.args || {}
          };
        }
      }
    }

    throw new Error('Invalid Gemini function call format');
  }

  formatResponse(result) {
    // Convert MCP content to Gemini-friendly format
    let textContent = '';
    const parts = [];

    if (result.content) {
      for (const item of result.content) {
        if (item.type === 'text') {
          textContent += item.text + '\n';
        } else if (item.type === 'image') {
          // Gemini can handle inline images
          if (item.data && item.mimeType) {
            parts.push({
              inline_data: {
                mime_type: item.mimeType,
                data: item.data
              }
            });
          }
        }
      }
    } else if (typeof result === 'string') {
      textContent = result;
    } else {
      textContent = JSON.stringify(result, null, 2);
    }

    // Add text content if we have any
    if (textContent.trim()) {
      parts.unshift({
        text: textContent.trim()
      });
    }

    // Gemini function response format
    return {
      function_response: {
        name: 'function_result',
        response: {
          parts: parts
        }
      }
    };
  }

  getToolDefinitions(toolSchemas) {
    // Convert MCP schemas to Gemini function declarations
    return Object.entries(toolSchemas).map(([name, schema]) => ({
      name: name,
      description: this.getToolDescription(name),
      parameters: this.convertSchemaToGemini(schema)
    }));
  }

  convertSchemaToGemini(mcpSchema) {
    // Convert MCP JSON schema to Gemini function parameters format
    const converted = {
      type: 'object',
      properties: {},
      required: mcpSchema.required || []
    };

    if (mcpSchema.properties) {
      for (const [key, prop] of Object.entries(mcpSchema.properties)) {
        converted.properties[key] = {
          type: this.mapTypeToGemini(prop.type),
          description: prop.description
        };

        // Handle arrays
        if (prop.type === 'array' && prop.items) {
          converted.properties[key].items = {
            type: this.mapTypeToGemini(prop.items.type)
          };
        }

        // Handle enums
        if (prop.enum) {
          converted.properties[key].enum = prop.enum;
        }

        // Handle objects
        if (prop.type === 'object' && prop.properties) {
          converted.properties[key].properties = {};
          for (const [subKey, subProp] of Object.entries(prop.properties)) {
            converted.properties[key].properties[subKey] = {
              type: this.mapTypeToGemini(subProp.type),
              description: subProp.description
            };
          }
        }
      }
    }

    return converted;
  }

  mapTypeToGemini(type) {
    // Map JSON Schema types to Gemini types
    const typeMap = {
      'string': 'STRING',
      'number': 'NUMBER', 
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'array': 'ARRAY',
      'object': 'OBJECT'
    };
    return typeMap[type] || 'STRING';
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
      function_response: {
        name: 'error',
        response: {
          parts: [{
            text: `Error: ${error.message}`
          }]
        }
      }
    };
  }
}