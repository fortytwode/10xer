import { TokenStorage } from '../auth/token-storage.js';
import { createErrorResponse } from '../utils/error-handler.js';

export async function facebookCheckAuth(args) {
  try {
    const tokenInfo = await TokenStorage.getTokenInfo();
    
    if (!tokenInfo.hasToken) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Not logged in to Facebook.\n\nRun facebook_login to authenticate and access your Facebook Ads data.',
          },
        ],
      };
    }

    if (tokenInfo.isExpired) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Your Facebook token has expired.\n\nToken was stored: ${tokenInfo.storedAt}\nToken expired: ${tokenInfo.expiresAt}\n\nPlease run facebook_login again to get a new token.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully authenticated with Facebook!\n\nToken stored: ${tokenInfo.storedAt}\nToken expires: ${tokenInfo.expiresAt}\n\nYou can now use all Facebook Ads tools:\n• facebook_list_ad_accounts\n• facebook_get_details_of_ad_account\n• facebook_get_adaccount_insights\n• facebook_get_activities_by_adaccount\n• facebook_fetch_pagination_url`,
        },
      ],
    };

  } catch (error) {
    return createErrorResponse(error);
  }
}