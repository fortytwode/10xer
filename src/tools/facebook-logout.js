import { TokenStorage } from '../auth/token-storage.js';
import { createErrorResponse } from '../utils/error-handler.js';

export async function facebookLogout(args) {
  try {
    const hasToken = await TokenStorage.hasValidToken();
    
    if (!hasToken) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ You are not currently logged in to Facebook.',
          },
        ],
      };
    }

    // Clear the stored token
    const success = await TokenStorage.clearToken();
    
    if (success) {
      return {
        content: [
          {
            type: 'text',
            text: '✅ Successfully logged out from Facebook!\n\nYour access token has been removed from secure storage. To use Facebook Ads tools again, you\'ll need to run facebook_login.',
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Failed to logout. There may have been an issue clearing your stored credentials.',
          },
        ],
      };
    }

  } catch (error) {
    return createErrorResponse(error);
  }
}