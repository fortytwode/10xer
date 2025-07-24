import { OAuthServer } from '../auth/oauth-server.js';
import { TokenStorage } from '../auth/token-storage.js';
import { createErrorResponse } from '../utils/error-handler.js';

let oauthServer = null;

export async function facebookLogin(args) {
  try {
    // Check if user is already authenticated
    const hasToken = await TokenStorage.hasValidToken();
    if (hasToken) {
      return {
        content: [
          {
            type: 'text',
            text: '✅ You are already logged in to Facebook! Use facebook_logout to disconnect and login with a different account.',
          },
        ],
      };
    }

    // Check if required environment variables are set
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Facebook App credentials not configured. Please add the following to your environment:

FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here

To get these credentials:
1. Go to https://developers.facebook.com/apps/
2. Create a new app or use an existing one
3. Go to App Settings > Basic
4. Copy the App ID and App Secret`,
          },
        ],
      };
    }

    // Start OAuth server if not already running
    if (!oauthServer) {
      oauthServer = new OAuthServer();
      await oauthServer.start(3002);
    }

    // Start the OAuth flow immediately
    await oauthServer.startOAuthFlow();

    return {
      content: [
        {
          type: 'text',
          text: '✅ Successfully logged in to Facebook!\n\nYou can now use Facebook Ads tools to:\n• List your ad accounts\n• Get account details and insights\n• View campaign performance\n• Access account activities',
        },
      ],
    };

  } catch (error) {
    return createErrorResponse(error);
  }
}

