import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AppsFlyer API Client for multi-client agency setup
 * Handles authentication and API requests for multiple client accounts
 */
export class AppsFlyerAPIClient {
  constructor() {
    this.baseURL = 'https://hq1.appsflyer.com/api';
    this.clients = this.loadClientConfigs();
    this.currentClientId = null;
  }

  /**
   * Load client configurations from environment variables
   * Expected format: APPSFLYER_CLIENT_A_TOKEN, APPSFLYER_CLIENT_A_NAME, etc.
   */
  loadClientConfigs() {
    const clients = {};
    const envVars = process.env;
    
    // Find all client configurations
    const clientTokens = Object.keys(envVars).filter(key => 
      key.startsWith('APPSFLYER_') && key.endsWith('_TOKEN')
    );

    for (const tokenKey of clientTokens) {
      // Extract client ID from env var name (e.g., APPSFLYER_CLIENT_A_TOKEN -> CLIENT_A)
      const clientId = tokenKey.replace('APPSFLYER_', '').replace('_TOKEN', '');
      const nameKey = `APPSFLYER_${clientId}_NAME`;
      const appsKey = `APPSFLYER_${clientId}_APPS`;

      clients[clientId.toLowerCase()] = {
        id: clientId.toLowerCase(),
        name: envVars[nameKey] || `Client ${clientId}`,
        token: envVars[tokenKey],
        apps: envVars[appsKey] ? envVars[appsKey].split(',').map(app => app.trim()) : []
      };
    }

    return clients;
  }

  /**
   * List all configured client accounts
   */
  getClients() {
    return Object.keys(this.clients).map(clientId => ({
      id: clientId,
      name: this.clients[clientId].name,
      appCount: this.clients[clientId].apps.length,
      hasToken: !!this.clients[clientId].token
    }));
  }

  /**
   * Set the current client for subsequent API calls
   */
  setCurrentClient(clientId) {
    if (!this.clients[clientId]) {
      throw new Error(`Client '${clientId}' not found. Available clients: ${Object.keys(this.clients).join(', ')}`);
    }
    
    if (!this.clients[clientId].token) {
      throw new Error(`No API token configured for client '${clientId}'. Please set APPSFLYER_${clientId.toUpperCase()}_TOKEN`);
    }

    this.currentClientId = clientId;
    return this.clients[clientId];
  }

  /**
   * Get current client configuration
   */
  getCurrentClient() {
    if (!this.currentClientId) {
      throw new Error('No client selected. Call setCurrentClient() first.');
    }
    return this.clients[this.currentClientId];
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, method = 'GET', params = {}, data = null) {
    const client = this.getCurrentClient();
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${client.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    };

    // Add query parameters for GET requests
    if (method === 'GET' && Object.keys(params).length > 0) {
      config.params = params;
    }

    // Add request body for POST/PUT requests
    if (data) {
      config.data = data;
    }

    try {
      console.error(`🔗 AppsFlyer API: ${method} ${endpoint} (Client: ${client.name})`);
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ AppsFlyer API Error:`, error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error(`Authentication failed for client '${this.currentClientId}'. Please check the API token.`);
      }
      
      if (error.response?.status === 403) {
        throw new Error(`Access denied. Client '${this.currentClientId}' may not have permission for this resource.`);
      }
      
      if (error.response?.status === 429) {
        throw new Error(`Rate limit exceeded for client '${this.currentClientId}'. Please try again later.`);
      }

      throw new Error(`AppsFlyer API request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Test authentication for a client
   */
  async testAuthentication(clientId) {
    this.setCurrentClient(clientId);
    
    try {
      // Use the app list endpoint to test authentication
      const response = await this.makeRequest('/mng/apps', 'GET', { limit: 1 });
      return {
        success: true,
        client: this.getCurrentClient(),
        appCount: response.apps?.length || 0,
        message: `Authentication successful for ${this.getCurrentClient().name}`
      };
    } catch (error) {
      return {
        success: false,
        client: this.getCurrentClient(),
        error: error.message
      };
    }
  }

  /**
   * Get apps list for current client
   */
  async getApps(limit = 100, offset = 0) {
    const params = { limit, offset };
    const response = await this.makeRequest('/mng/apps', 'GET', params);
    return response.apps || [];
  }

  /**
   * Get installs report for an app
   */
  async getInstallsReport(appId, dateRange, options = {}) {
    const client = this.getCurrentClient();
    
    // Validate app belongs to current client
    if (client.apps.length > 0 && !client.apps.includes(appId)) {
      console.warn(`⚠️ App ${appId} not in configured apps list for client ${client.name}`);
    }

    const params = {
      from: dateRange.from,
      to: dateRange.to,
      timezone: options.timezone || 'UTC',
      ...options
    };

    const endpoint = `/raw-data/export/app/${appId}/installs_report/v5`;
    return await this.makeRequest(endpoint, 'GET', params);
  }

  /**
   * Get in-app events report for an app
   */
  async getEventsReport(appId, dateRange, options = {}) {
    const client = this.getCurrentClient();
    
    // Validate app belongs to current client
    if (client.apps.length > 0 && !client.apps.includes(appId)) {
      console.warn(`⚠️ App ${appId} not in configured apps list for client ${client.name}`);
    }

    const params = {
      from: dateRange.from,
      to: dateRange.to,
      timezone: options.timezone || 'UTC',
      ...options
    };

    const endpoint = `/raw-data/export/app/${appId}/in_app_events_report/v5`;
    return await this.makeRequest(endpoint, 'GET', params);
  }

  /**
   * Get aggregate overview report for an app
   */
  async getOverviewReport(appId, dateRange, options = {}) {
    const client = this.getCurrentClient();
    
    // Validate app belongs to current client
    if (client.apps.length > 0 && !client.apps.includes(appId)) {
      console.warn(`⚠️ App ${appId} not in configured apps list for client ${client.name}`);
    }

    const params = {
      from: dateRange.from,
      to: dateRange.to,
      timezone: options.timezone || 'UTC',
      grouping: options.grouping || 'day',
      ...options
    };

    const endpoint = `/agg-data/export/app/${appId}/overview_report/v5`;
    return await this.makeRequest(endpoint, 'GET', params);
  }

  /**
   * Get partners report (media sources performance)
   */
  async getPartnersReport(appId, dateRange, options = {}) {
    const client = this.getCurrentClient();
    
    // Validate app belongs to current client
    if (client.apps.length > 0 && !client.apps.includes(appId)) {
      console.warn(`⚠️ App ${appId} not in configured apps list for client ${client.name}`);
    }

    const params = {
      from: dateRange.from,
      to: dateRange.to,
      timezone: options.timezone || 'UTC',
      grouping: options.grouping || 'day',
      ...options
    };

    const endpoint = `/agg-data/export/app/${appId}/partners_report/v5`;
    return await this.makeRequest(endpoint, 'GET', params);
  }

  /**
   * Get cohort report for LTV analysis
   */
  async getCohortReport(appId, dateRange, options = {}) {
    const client = this.getCurrentClient();
    
    // Validate app belongs to current client
    if (client.apps.length > 0 && !client.apps.includes(appId)) {
      console.warn(`⚠️ App ${appId} not in configured apps list for client ${client.name}`);
    }

    const params = {
      from: dateRange.from,
      to: dateRange.to,
      timezone: options.timezone || 'UTC',
      period: options.period || 'day',
      ...options
    };

    const endpoint = `/agg-data/export/app/${appId}/cohort_report/v5`;
    return await this.makeRequest(endpoint, 'GET', params);
  }

  /**
   * Validate date range format
   */
  static validateDateRange(dateRange) {
    if (!dateRange.from || !dateRange.to) {
      throw new Error('Date range must include both from and to dates');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateRange.from) || !dateRegex.test(dateRange.to)) {
      throw new Error('Dates must be in YYYY-MM-DD format');
    }

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);

    if (fromDate > toDate) {
      throw new Error('From date cannot be later than to date');
    }

    return true;
  }

  /**
   * Helper to format date range for display
   */
  static formatDateRange(dateRange) {
    return `${dateRange.from} to ${dateRange.to}`;
  }
}