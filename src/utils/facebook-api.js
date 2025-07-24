import axios from 'axios';
import { TokenStorage } from '../auth/token-storage.js';

export class FacebookAPIClient {
  constructor() {
    this.baseURL = process.env.FACEBOOK_BASE_URL || 'https://graph.facebook.com';
    this.version = process.env.FACEBOOK_API_VERSION || 'v23.0';
    this.accessToken = null;

    this.client = axios.create({
      baseURL: `${this.baseURL}/${this.version}`,
      timeout: 30000,
    });
  }

  async getAccessToken() {
    // Try stored token first
    const storedToken = await TokenStorage.getToken();
    if (storedToken) {
      this.accessToken = storedToken;
      return storedToken;
    }

    // Only allow hardcoded token for testing purposes
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.FACEBOOK_ALLOW_HARDCODED_TOKEN === 'true';
    
    if (isTestMode && process.env.FACEBOOK_ACCESS_TOKEN) {
      console.error('⚠️  Using hardcoded access token (TEST MODE ONLY)');
      this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
      return this.accessToken;
    }

    throw new Error('No Facebook access token available. Please run facebook_login to authenticate.');
  }

  async makeRequest(endpoint, methodOrParams = 'GET', params = {}) {
    try {
      // Handle backward compatibility: makeRequest(endpoint, params) or makeRequest(endpoint, method, params)
      let method = 'GET';
      let actualParams = {};
      
      if (typeof methodOrParams === 'string') {
        // New format: makeRequest(endpoint, method, params)
        method = methodOrParams;
        actualParams = params;
      } else {
        // Old format: makeRequest(endpoint, params)
        method = 'GET';
        actualParams = methodOrParams || {};
      }

      // Ensure we have a valid token
      const accessToken = await this.getAccessToken();
      
      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (method.toUpperCase() === 'GET') {
        config.params = {
          access_token: accessToken,
          ...actualParams,
        };
      } else {
        config.data = {
          access_token: accessToken,
          ...actualParams,
        };
      }

      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  async makeRequestFromFullURL(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  async makeBatchRequest(batchRequests) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await this.client.post('/', {
        access_token: accessToken,
        batch: JSON.stringify(batchRequests)
      });

      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  handleAPIError(error) {
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      throw new Error(`Facebook API Error: ${fbError.message} (Code: ${fbError.code})`);
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - Facebook API took too long to respond');
    }

    throw new Error(`API Request failed: ${error.message}`);
  }
}