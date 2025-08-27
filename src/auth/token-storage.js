import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.resolve('./.tokens.json');

function readFromFile() {
  if (!fs.existsSync(TOKEN_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch (err) {
    console.error('❌ Failed to read token file:', err.message);
    return {};
  }
}

function saveToFile(data) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Failed to write token file:', err.message);
  }
}

// function readFromFile() {
//   if (!fs.existsSync(TOKEN_FILE)) return {};
//   return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
// }

// function saveToFile(data) {
//   fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
// }

export class TokenStorage {
  static async storeTokenForUser(userId, accessToken, expiresIn = null) {
    try {
      const allTokens = readFromFile();

      allTokens[userId] = {
        accessToken,
        storedAt: Date.now(),
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null
      };

      saveToFile(allTokens);
      console.error(`✅ Token stored for user: ${userId}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to store token for user ${userId}:`, err.message);
      return false;
    }
  }

  static async getTokenForUser(userId) {
    try {
      const allTokens = readFromFile();
      const tokenData = allTokens[userId];
      if (!tokenData) return null;

      if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
        console.warn(`⚠️ Token for user ${userId} has expired`);
        delete allTokens[userId];
        saveToFile(allTokens);
        return null;
      }

      return tokenData.accessToken;
    } catch (err) {
      console.error(`❌ Failed to get token for user ${userId}:`, err.message);
      return null;
    }
  }

  static async getTokenInfoForUser(userId) {
    try {
      const allTokens = readFromFile();
      const tokenData = allTokens[userId];
      if (!tokenData) return { hasToken: false };

      const isExpired = tokenData.expiresAt && Date.now() > tokenData.expiresAt;

      return {
        hasToken: true,
        isExpired,
        storedAt: new Date(tokenData.storedAt).toISOString(),
        expiresAt: tokenData.expiresAt
          ? new Date(tokenData.expiresAt).toISOString()
          : 'Never'
      };
    } catch (error) {
      return { hasToken: false, error: error.message };
    }
  }

  static async clearTokenForUser(userId) {
    try {
      const allTokens = readFromFile();
      delete allTokens[userId];
      saveToFile(allTokens);
      console.error(`🗑️ Cleared token for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to clear token for user ${userId}:`, error.message);
      return false;
    }
  }
}

// import fs from 'fs';
// import path from 'path';

// const TOKEN_FILE = path.resolve('./.tokens.json');

// function saveToFile(tokenData) {
//   fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
// }

// function readFromFile() {
//   if (!fs.existsSync(TOKEN_FILE)) return null;
//   return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
// }

// function clearFile() {
//   if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
// }

// export class TokenStorage {
//   static async storeToken(accessToken, expiresIn = null) {
//     try {
//       const tokenData = {
//         accessToken,
//         expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
//         storedAt: Date.now()
//       };

//       saveToFile(tokenData);
//       console.error('✅ Facebook token stored in file (.tokens.json)');
//       return true;
//     } catch (error) {
//       console.error('❌ Failed to store token:', error.message);
//       return false;
//     }
//   }

//   static async getToken() {
//     try {
//       const tokenData = readFromFile();
//       if (!tokenData) return null;

//       if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
//         console.error('⚠️ Stored token has expired');
//         await this.clearToken();
//         return null;
//       }

//       return tokenData.accessToken;
//     } catch (error) {
//       console.error('❌ Failed to retrieve token:', error.message);
//       return null;
//     }
//   }

//   static async clearToken() {
//     try {
//       clearFile();
//       console.error('🗑️ Facebook token cleared (file)');
//       return true;
//     } catch (error) {
//       console.error('❌ Failed to clear token:', error.message);
//       return false;
//     }
//   }

//   static async hasValidToken() {
//     const token = await this.getToken();
//     return token !== null;
//   }

//   static async getTokenInfo() {
//     try {
//       const tokenData = readFromFile();
//       if (!tokenData) return { hasToken: false };

//       const isExpired = tokenData.expiresAt && Date.now() > tokenData.expiresAt;

//       return {
//         hasToken: true,
//         isExpired,
//         storedAt: new Date(tokenData.storedAt).toISOString(),
//         expiresAt: tokenData.expiresAt
//           ? new Date(tokenData.expiresAt).toISOString()
//           : 'Never'
//       };
//     } catch (error) {
//       return { hasToken: false, error: error.message };
//     }
//   }
// }