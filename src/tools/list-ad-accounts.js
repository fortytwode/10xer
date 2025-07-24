import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';

export async function listAdAccounts(args) {
  try {
    const client = new FacebookAPIClient();
    
    // Get user ID first
    const userResponse = await client.makeRequest('/me', { fields: 'id' });
    const userId = userResponse.id;

    // Get ad accounts for the user
    const data = await client.makeRequest(`/${userId}/adaccounts`, {
      fields: 'name,id',
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            adaccounts: data,
            id: userId,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return createErrorResponse(error);
  }
}