import axios from 'axios';

export class FacebookAPIClient {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('Access token must be provided to FacebookAPIClient');
    }

    this.baseURL = process.env.FACEBOOK_BASE_URL || 'https://graph.facebook.com';
    this.version = process.env.FACEBOOK_API_VERSION || 'v23.0';
    this.accessToken = accessToken;

    this.client = axios.create({
      baseURL: `${this.baseURL}/${this.version}`,
      timeout: 30000,
    });
  }

  async makeRequest(endpoint, methodOrParams = 'GET', params = {}) {
    try {
      // Determine method and params (support old and new formats)
      let method = 'GET';
      let actualParams = {};

      if (typeof methodOrParams === 'string') {
        method = methodOrParams;
        actualParams = params;
      } else {
        actualParams = methodOrParams || {};
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (method.toUpperCase() === 'GET') {
        config.params = {
          access_token: this.accessToken,
          ...actualParams,
        };
      } else {
        config.data = {
          access_token: this.accessToken,
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
      const response = await this.client.post('/', {
        access_token: this.accessToken,
        batch: JSON.stringify(batchRequests),
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
