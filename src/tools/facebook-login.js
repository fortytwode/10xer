import { OAuthServer } from '../auth/oauth-server.js';
import { TokenStorage } from '../auth/token-storage.js';
import { getFacebookTokenFromCLI } from '../utils/cli-args.js';
import { createErrorResponse } from '../utils/error-handler.js';

let oauthServer = null;

export async function facebookLogin(args) {
  try {
    // 🔍 Step 1: Look for CLI-provided token
    const { token: cliToken, expiresIn } = getFacebookTokenFromCLI();

    if (cliToken) {
      await TokenStorage.storeToken(cliToken, expiresIn);
      return {
        content: [
          {
            type: 'text',
            text: '✅ Facebook token provided via CLI. You are now logged in.',
          },
        ],
      };
    }

    // 🔐 Step 2: Check for existing valid stored token
    const hasToken = await TokenStorage.hasValidToken();
    if (hasToken) {
      return {
        content: [
          {
            type: 'text',
            text: '✅ You are already logged in to Facebook. Use facebook_logout to disconnect and login with another account.',
          },
        ],
      };
    }

//     // ⚙️ Step 3: Ensure env vars are set
//     if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
//       return {
//         content: [
//           {
//             type: 'text',
//             text: `❌ Facebook App credentials not configured. Please add these to your .env file:

// FACEBOOK_APP_ID=your_app_id_here
// FACEBOOK_APP_SECRET=your_app_secret_here`,
//           },
//         ],
//       };
//     }

    // 🚀 Step 4: Start OAuth server
    if (!oauthServer) {
      oauthServer = new OAuthServer();
      await oauthServer.start(3002);
    }

    await oauthServer.startOAuthFlow();

    return {
      content: [
        {
          type: 'text',
          text: '✅ Successfully logged in to Facebook using OAuth!\nYou can now access ad accounts and insights.',
        },
      ],
    };

  } catch (error) {
    return createErrorResponse(error);
  }
}
