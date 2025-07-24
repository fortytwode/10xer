import keytar from 'keytar';

const SERVICE_NAME = 'facebook-ads-mcp';
const ACCOUNT_NAME = 'facebook-access-token';

export class TokenStorage {
  static async storeToken(accessToken, expiresIn = null) {
    try {
      const tokenData = {
        accessToken,
        expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : null,
        storedAt: Date.now()
      };
      
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify(tokenData));
      console.error('✅ Facebook token stored securely');
      return true;
    } catch (error) {
      console.error('❌ Failed to store token:', error.message);
      return false;
    }
  }

  static async getToken() {
    try {
      const tokenJson = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (!tokenJson) {
        return null;
      }

      const tokenData = JSON.parse(tokenJson);
      
      // Check if token is expired
      if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
        console.error('⚠️ Stored token has expired');
        await this.clearToken();
        return null;
      }

      return tokenData.accessToken;
    } catch (error) {
      console.error('❌ Failed to retrieve token:', error.message);
      return null;
    }
  }

  static async clearToken() {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      console.error('🗑️ Facebook token cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear token:', error.message);
      return false;
    }
  }

  static async hasValidToken() {
    const token = await this.getToken();
    return token !== null;
  }

  static async getTokenInfo() {
    try {
      const tokenJson = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (!tokenJson) {
        return { hasToken: false };
      }

      const tokenData = JSON.parse(tokenJson);
      const isExpired = tokenData.expiresAt && Date.now() > tokenData.expiresAt;
      
      return {
        hasToken: true,
        isExpired,
        storedAt: new Date(tokenData.storedAt).toISOString(),
        expiresAt: tokenData.expiresAt ? new Date(tokenData.expiresAt).toISOString() : 'Never'
      };
    } catch (error) {
      return { hasToken: false, error: error.message };
    }
  }
}