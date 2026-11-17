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
      maxRedirects: 0,
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

      if (!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(endpoint) ||
          new URL(endpoint, this.baseURL).origin !== new URL(this.baseURL).origin) {
        throw new Error('Expected a relative Graph resource path.');
      }
      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (method.toUpperCase() === 'GET') {
        config.params = {
          ...actualParams,
          access_token: this.accessToken,
        };
      } else {
        config.data = {
          ...actualParams,
          access_token: this.accessToken,
        };
      }

      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  async makeRequestFromFullURL(url) {
    const page = new URL(url);
    if (page.origin !== 'https://graph.facebook.com' || page.username || page.password || page.hash) {
      throw new Error('Expected a Facebook Graph pagination URL.');
    }
    // Authorize this page as the current account, using the cursor returned by Graph.
    page.searchParams.delete('access_token');
    try {
      const response = await this.client.get(page.href, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        maxRedirects: 0,
        maxContentLength: 8 * 1024 * 1024,
      });
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
