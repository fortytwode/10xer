import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import open from 'open';
import { TokenStorage } from './token-storage.js';

export class OAuthServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.pendingAuth = new Map(); // state -> resolve function
    this.port = 3002; // Default port
    this.setupRoutes();
  }

  setupRoutes() {
    // OAuth callback endpoint
    this.app.get('/auth/callback', async (req, res) => {
      const { code, state, error, token, expires_in } = req.query;

      if (error) {
        console.error('❌ Facebook OAuth error:', error);
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Authentication Failed</h2>
              <p>Error: ${error}</p>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `);
        
        const resolver = this.pendingAuth.get(state);
        if (resolver) {
          resolver.reject(new Error(`OAuth error: ${error}`));
          this.pendingAuth.delete(state);
        }
        return;
      }

      if (!state) {
        console.error('❌ Missing state in OAuth callback');
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Authentication Failed</h2>
              <p>Missing state parameter.</p>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `);
        return;
      }

      try {
        let accessToken;
        let tokenExpiresIn;

        if (token) {
          // Token provided by relay service
          console.error('✅ Received token from relay service');
          accessToken = token;
          tokenExpiresIn = expires_in ? parseInt(expires_in) : null;
        } else if (code) {
          // Traditional OAuth flow (development mode)
          console.error('🔄 Exchanging code for token...');
          const tokenResponse = await this.exchangeCodeForToken(code);
          accessToken = tokenResponse.access_token;
          tokenExpiresIn = tokenResponse.expires_in;
        } else {
          throw new Error('No token or code provided');
        }
        
        // Store token securely
        await TokenStorage.storeToken(accessToken, tokenExpiresIn);
        
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #27ae60;">✅ Successfully Connected to Facebook!</h2>
              <p>Your Facebook account has been linked successfully.</p>
              <p>You can now close this window and return to Claude.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        // Resolve the pending promise
        const resolver = this.pendingAuth.get(state);
        if (resolver) {
          resolver.resolve(tokenResponse);
          this.pendingAuth.delete(state);
        }

      } catch (error) {
        console.error('❌ Error exchanging code for token:', error.message);
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Authentication Failed</h2>
              <p>Failed to complete authentication: ${error.message}</p>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `);

        const resolver = this.pendingAuth.get(state);
        if (resolver) {
          resolver.reject(error);
          this.pendingAuth.delete(state);
        }
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'facebook-ads-mcp-oauth' });
    });
  }

  async exchangeCodeForToken(code) {
    const tokenUrl = 'https://graph.facebook.com/v23.0/oauth/access_token';
    
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3002/auth/callback',
      code: code
    });

    const response = await fetch(`${tokenUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    return await response.json();
  }

  async startOAuthFlow() {
    return new Promise((resolve, reject) => {
      // Generate state parameter for security
      const state = uuidv4();
      
      // Store the resolver for this auth attempt
      this.pendingAuth.set(state, { resolve, reject });

      // Build Facebook OAuth URL
      const authUrl = this.buildAuthUrl(state);
      
      console.error('🌐 Opening Facebook login in browser...');
      console.error(`📱 If browser doesn't open, visit: ${authUrl}`);
      
      // Open browser
      open(authUrl).catch(error => {
        console.error('❌ Failed to open browser:', error.message);
        console.error(`🔗 Please manually visit: ${authUrl}`);
      });

      // Set timeout for auth attempt (5 minutes)
      setTimeout(() => {
        if (this.pendingAuth.has(state)) {
          this.pendingAuth.delete(state);
          reject(new Error('OAuth timeout: User did not complete authentication within 5 minutes'));
        }
      }, 5 * 60 * 1000);
    });
  }

  async startRelayOAuthFlow() {
    return new Promise((resolve, reject) => {
      // Generate state parameter for security
      const state = uuidv4();
      
      // Store the resolver for this auth attempt
      this.pendingAuth.set(state, { resolve, reject });

      // Build relay OAuth URL
      const relayUrl = `${process.env.OAUTH_RELAY_URL}/auth/start?state=${state}&port=${this.port}`;
      
      console.error('🌐 Opening relay OAuth in browser...');
      console.error(`🔗 Relay URL: ${relayUrl}`);
      
      // Open browser to relay service
      open(relayUrl).catch(error => {
        console.error('❌ Failed to open browser:', error.message);
        console.error(`🔗 Please manually visit: ${relayUrl}`);
      });

      // Set timeout for auth attempt (5 minutes)
      setTimeout(() => {
        if (this.pendingAuth.has(state)) {
          this.pendingAuth.delete(state);
          reject(new Error('OAuth timeout: User did not complete authentication within 5 minutes'));
        }
      }, 5 * 60 * 1000);
    });
  }

  buildAuthUrl(state) {
    const baseUrl = 'https://www.facebook.com/v23.0/dialog/oauth';
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3002/auth/callback';
    
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: redirectUri,
      scope: 'ads_read,ads_management,business_management',
      response_type: 'code',
      state: state
    });

    const fullUrl = `${baseUrl}?${params}`;
    console.error('🔍 OAuth URL Configuration:');
    console.error('   App ID:', process.env.FACEBOOK_APP_ID);
    console.error('   Redirect URI:', redirectUri);
    console.error('   Full OAuth URL:', fullUrl);
    
    return fullUrl;
  }

  async start(port = 3002) {
    this.port = port; // Store port for relay OAuth flow
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, 'localhost', (error) => {
        if (error) {
          console.error(`❌ Failed to start OAuth server on port ${port}:`, error.message);
          reject(error);
        } else {
          console.error(`🚀 OAuth server running on http://localhost:${port}`);
          resolve(port);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.error('🛑 OAuth server stopped');
          resolve();
        });
      });
    }
  }
}