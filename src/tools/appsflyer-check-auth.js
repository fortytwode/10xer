import { AppsFlyerAPIClient } from '../utils/appsflyer-api.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';
import { createErrorResponse } from '../utils/error-handler.js';

/**
 * Check AppsFlyer authentication status for a client
 */
export async function appsflyerCheckAuth(args) {
  try {
    // Validate parameters
    const validatedArgs = validateParameters(ValidationSchemas.appsflyerCheckAuth, args);
    const { client_id } = validatedArgs;

    const appsflyerAPI = new AppsFlyerAPIClient();
    console.error(`🔐 Checking AppsFlyer authentication for client: ${client_id}`);

    // Test authentication
    const authResult = await appsflyerAPI.testAuthentication(client_id);

    if (authResult.success) {
      const client = authResult.client;
      
      let response = `✅ **AppsFlyer Authentication Successful!**\n\n`;
      response += `**Client**: ${client.name} (${client.id})\n`;
      response += `**Apps Configured**: ${client.apps.length > 0 ? client.apps.join(', ') : 'None specified'}\n`;
      response += `**Apps Found**: ${authResult.appCount}\n`;
      response += `**Token Status**: Valid\n\n`;
      
      if (client.apps.length === 0) {
        response += `💡 **Tip**: Configure apps for this client by setting:\n`;
        response += `\`APPSFLYER_${client.id.toUpperCase()}_APPS=com.app1,com.app2\`\n\n`;
      }
      
      response += `You can now use AppsFlyer tools:\n`;
      response += `• appsflyer_list_apps\n`;
      response += `• appsflyer_get_installs\n`;
      response += `• appsflyer_get_events\n`;
      response += `• appsflyer_get_overview\n`;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } else {
      let response = `❌ **AppsFlyer Authentication Failed**\n\n`;
      response += `**Client**: ${authResult.client.name} (${authResult.client.id})\n`;
      response += `**Error**: ${authResult.error}\n\n`;
      response += `**Troubleshooting**:\n`;
      response += `1. Check your API token in environment variables\n`;
      response += `2. Ensure token has proper permissions\n`;
      response += `3. Verify token hasn't expired (recommended refresh every 180 days)\n\n`;
      response += `**Required Environment Variable**:\n`;
      response += `\`APPSFLYER_${authResult.client.id.toUpperCase()}_TOKEN=your_jwt_token_here\``;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    }

  } catch (error) {
    console.error('Error in appsflyerCheckAuth:', error);
    return createErrorResponse(error);
  }
}

/**
 * List all configured AppsFlyer client accounts
 */
export async function appsflyerListClients(args) {
  try {
    const appsflyerAPI = new AppsFlyerAPIClient();
    console.error(`📋 Listing AppsFlyer client accounts`);

    const clients = appsflyerAPI.getClients();

    if (clients.length === 0) {
      let response = `📋 **No AppsFlyer Clients Configured**\n\n`;
      response += `To add AppsFlyer clients, set environment variables:\n\n`;
      response += `**Example Configuration:**\n`;
      response += `\`\`\`\n`;
      response += `APPSFLYER_CLIENT_A_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...\n`;
      response += `APPSFLYER_CLIENT_A_NAME=Client A Corp\n`;
      response += `APPSFLYER_CLIENT_A_APPS=com.clienta.app1,com.clienta.app2\n\n`;
      response += `APPSFLYER_CLIENT_B_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...\n`;
      response += `APPSFLYER_CLIENT_B_NAME=Client B Inc\n`;
      response += `APPSFLYER_CLIENT_B_APPS=com.clientb.mainapp\n`;
      response += `\`\`\`\n\n`;
      response += `**Getting Your API Token:**\n`;
      response += `1. Go to AppsFlyer dashboard → Account menu → Security center\n`;
      response += `2. Click "Manage your AppsFlyer API tokens"\n`;
      response += `3. Copy the API V2 token (JWT format)\n`;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    }

    let response = `📋 **AppsFlyer Client Accounts**\n\n`;
    response += `Found ${clients.length} configured client${clients.length === 1 ? '' : 's'}:\n\n`;

    for (const [index, client] of clients.entries()) {
      response += `**${index + 1}. ${client.name}**\n`;
      response += `• Client ID: ${client.id}\n`;
      response += `• Token Status: ${client.hasToken ? '✅ Configured' : '❌ Missing'}\n`;
      response += `• Apps Configured: ${client.appCount > 0 ? client.appCount : 'None'}\n\n`;
    }

    response += `**Next Steps:**\n`;
    response += `• Use \`appsflyer_check_auth\` to test authentication\n`;
    response += `• Use \`appsflyer_list_apps\` to see available apps\n`;
    response += `• Use \`appsflyer_get_installs\` to retrieve data\n`;

    return {
      content: [{
        type: 'text',
        text: response
      }]
    };

  } catch (error) {
    console.error('Error in appsflyerListClients:', error);
    return createErrorResponse(error);
  }
}