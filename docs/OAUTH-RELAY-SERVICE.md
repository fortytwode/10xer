# OAuth Relay Service Implementation Plan

## Executive Summary

This document outlines the plan to implement a centralized OAuth relay service that will enable our Facebook Ads MCP Server to work with Facebook Live Apps, allowing any user to authenticate without being manually added as a tester.

## Background: What is MCP?

### Model Context Protocol (MCP)
MCP (Model Context Protocol) is an open protocol developed by Anthropic that enables AI assistants like Claude to securely connect to external data sources and tools. MCP servers run locally on a user's machine and provide tools and resources that Claude can use during conversations.

Key characteristics of MCP:
- **Runs locally**: MCP servers execute on the user's own machine, not in the cloud
- **Secure**: All data stays on the user's machine unless explicitly sent elsewhere
- **Tool-based**: Provides specific tools/functions that Claude can call
- **Standardized**: Uses a common protocol that works with Claude Desktop and other MCP clients

### Our Facebook Ads MCP Server
Our MCP server (`facebook-ads-mcp-server`) enables Claude to interact with Facebook Ads data directly. Users can ask Claude to:
- List and analyze ad accounts
- Retrieve campaign performance metrics
- Get ad insights and analytics
- View ad creatives and assets
- Access account activity logs

**How it works:**
1. User installs our MCP server globally via npm
2. User configures Claude Desktop to connect to our server
3. User authenticates with Facebook via OAuth
4. Claude can now access Facebook Ads data through our provided tools

**Current Tools Available:**
- `facebook_login` - Authenticate with Facebook
- `facebook_logout` - Clear authentication
- `facebook_check_auth` - Check authentication status
- `facebook_list_ad_accounts` - List all ad accounts
- `facebook_get_adaccount_insights` - Get performance metrics
- `facebook_get_ad_creatives` - Retrieve ad creative assets
- And several more data retrieval tools

### The Authentication Challenge
Since MCP servers run locally on each user's machine (not on a central server), our OAuth flow must handle authentication from `localhost`. This creates a unique challenge when working with Facebook's OAuth system, which has different requirements for Development vs Live apps.

## Current State - What We Have Accomplished ✅

### 1. Full OAuth Implementation
We have successfully implemented a complete OAuth flow that:
- Runs a local OAuth server on port 3002
- Opens Facebook login in the user's browser
- Handles the OAuth callback locally
- Stores tokens securely using keytar
- Provides login/logout/check-auth commands

**Files involved:**
- `src/auth/oauth-server.js` - Local OAuth server implementation
- `src/auth/token-storage.js` - Secure token management
- `src/tools/facebook-login.js` - Login command
- `src/tools/facebook-logout.js` - Logout command
- `src/tools/facebook-check-auth.js` - Auth status check

### 2. Current Limitations
- **Works only with Facebook Development Apps** - Due to Facebook's security restrictions, live apps reject `localhost` redirect URLs
- **Requires manual user addition** - Each user must be added as a tester to the Facebook app
- **Port mismatch issue (FIXED)** - We fixed the redirect URI port from 3000 to 3002

### 3. Current User Flow
```
1. User installs MCP server: npm install -g facebook-ads-mcp-server
2. User configures Claude Desktop with App ID/Secret
3. User runs facebook_login command
4. Browser opens → Facebook OAuth → Redirects to localhost:3002
5. Token stored locally
```

## The Problem We're Solving

### Facebook's Live App Restrictions
- Live Facebook apps reject `localhost` as a valid OAuth redirect domain
- This prevents public users from authenticating
- Development apps work but limit us to ~1000 manually added testers

### Reference: GoMarble's Solution
The [GoMarble Facebook Ads MCP server](https://github.com/gomarble-ai/facebook-ads-mcp-server) solves this by:
- Providing a centralized OAuth service at `gomarble.ai`
- Their installer connects to GoMarble's servers to handle OAuth
- Returns the token to the user's local machine
- This allows them to use a live Facebook app

**Repository**: https://github.com/gomarble-ai/facebook-ads-mcp-server

**Key insight:** They separate the OAuth flow from the MCP server, using a cloud service as an intermediary.

## Proposed Solution - OAuth Relay Service

### Architecture Overview

```
Current Flow (Development Mode):
User → MCP (localhost) → Facebook → localhost:3002

New Flow (Live Mode):
User → MCP (localhost) → Relay Service (cloud) → Facebook → Relay → localhost:3002
```

### How the Relay Service Works

1. **User initiates login** via `facebook_login` command
2. **MCP opens browser** to relay service URL (e.g., `https://fb-oauth.railway.app/auth/start`)
3. **Relay service** redirects to Facebook OAuth with its domain as redirect URI
4. **Facebook** redirects back to relay service with auth code
5. **Relay service** exchanges code for token
6. **Relay service** redirects to `localhost:3002` with the token
7. **MCP stores token** locally

## Implementation Roadmap

### Phase 1: Create Relay Service

#### 1.1 Project Structure
```
oauth-relay-service/
├── package.json
├── index.js
├── .env
└── README.md
```

#### 1.2 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.0",
    "axios": "^1.6.0"
  }
}
```

#### 1.3 Core Endpoints

**GET /auth/start**
- Parameters: `state` (CSRF protection), `port` (callback port, default 3002)
- Stores state temporarily (in-memory with TTL)
- Redirects to Facebook OAuth URL

**GET /auth/callback**
- Parameters: `code` (from Facebook), `state`
- Exchanges code for access token using Facebook Graph API
- Retrieves original port from state store
- Redirects to `http://localhost:{port}/auth/callback?token={token}&state={state}`

**GET /health**
- Returns service status for Railway monitoring

#### 1.4 Security Measures
- State parameter validation (CSRF protection)
- Time-limited states (5-minute expiry)
- HTTPS only in production
- No token storage on relay service
- Rate limiting per IP

### Phase 2: Deploy to Railway

#### 2.1 Deployment Steps
1. Create new Railway project
2. Connect GitHub repository
3. Set environment variables:
   ```
   FACEBOOK_APP_ID=2665882530122826
   FACEBOOK_APP_SECRET=[secret]
   RELAY_DOMAIN=https://[service-name].railway.app
   NODE_ENV=production
   ```
4. Deploy and get Railway URL

#### 2.2 Testing
- Verify health endpoint
- Test OAuth flow with development app first
- Monitor Railway logs

### Phase 3: Configure Facebook App

#### 3.1 Development Testing
1. Add Railway domain to App Domains
2. Add `https://[relay].railway.app/auth/callback` to Valid OAuth Redirect URIs
3. Test with app in Development mode

#### 3.2 Go Live
1. Complete App Review requirements
2. Switch app to Live mode
3. Verify public users can authenticate

### Phase 4: Update MCP Server

#### 4.1 Code Changes

**src/auth/oauth-server.js**
```javascript
// Modify startOAuthFlow method
startOAuthFlow() {
  const state = uuidv4();
  
  // Use relay service if configured
  const authUrl = process.env.OAUTH_RELAY_URL 
    ? `${process.env.OAUTH_RELAY_URL}/auth/start?state=${state}&port=${this.port}`
    : this.buildAuthUrl(state);  // fallback to direct OAuth
    
  open(authUrl);
}

// Modify callback handler to accept token from relay
app.get('/auth/callback', async (req, res) => {
  const { token, code, state } = req.query;
  
  if (token) {
    // Token provided by relay service
    await TokenStorage.storeToken(token);
  } else if (code) {
    // Traditional OAuth flow (development mode)
    const token = await this.exchangeCodeForToken(code);
    await TokenStorage.storeToken(token);
  }
  // ... rest of handler
});
```

#### 4.2 Configuration
Add optional environment variable:
```json
{
  "env": {
    "OAUTH_RELAY_URL": "https://fb-oauth.railway.app",
    "FACEBOOK_APP_ID": "...",
    "FACEBOOK_APP_SECRET": "..."
  }
}
```

#### 4.3 Backward Compatibility
- If `OAUTH_RELAY_URL` is not set, use direct OAuth (current behavior)
- This allows both development and production modes to coexist
- Users can choose their preferred method

### Phase 5: Testing & Documentation

#### 5.1 Testing Matrix
- [ ] Development mode without relay (current behavior)
- [ ] Development mode with relay
- [ ] Live mode with relay
- [ ] Token storage and retrieval
- [ ] API calls with obtained token
- [ ] Error handling (network issues, invalid state, etc.)

#### 5.2 Documentation Updates
- Update README with both authentication options
- Add relay service setup guide
- Include troubleshooting section
- Provide migration guide for existing users

## Success Criteria

1. **Public Access**: Any user can authenticate without being added as tester
2. **Backward Compatible**: Existing development mode still works
3. **Secure**: Tokens never stored on relay service
4. **Reliable**: Graceful fallback if relay is unavailable
5. **Simple**: No additional dependencies for end users

## Timeline

### Updated Roadmap - August 11th, 2025

**Streamlined 4-Day Implementation Plan** (Internal Team First)

- **Day 1-2**: Build and deploy relay service to Railway
- **Day 3**: Integrate relay support into MCP server
- **Day 4**: Team testing and iteration

### Original Timeline (Reference)

- **Day 1**: Create and test relay service locally
- **Day 2**: Deploy to Railway and test with development app
- **Day 3**: Update MCP server to support relay
- **Day 4**: Switch to live app and final testing
- **Day 5**: Documentation and npm publish

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Relay service downtime | Fallback to direct OAuth for development mode |
| Security vulnerabilities | State validation, HTTPS only, rate limiting |
| Facebook API changes | Monitor Facebook changelog, version lock API |
| Token expiration | Clear documentation on re-authentication |

## Comparison with GoMarble Approach

**Reference Repository**: [GoMarble Facebook Ads MCP](https://github.com/gomarble-ai/facebook-ads-mcp-server)

| Aspect | Our Approach | GoMarble Approach |
|--------|--------------|-------------------|
| Primary Auth | OAuth flow | Manual token or OAuth via installer |
| Relay Service | Simple Node.js on Railway | GoMarble.ai infrastructure |
| Token Storage | Local (keytar) | Local (filesystem) |
| User Experience | One-click browser OAuth | Installer or manual token |
| Open Source | Fully open source | Relay service proprietary |

## Next Steps

1. Review and approve this plan
2. Create relay service repository
3. Implement and deploy relay service
4. Update MCP server
5. Test end-to-end flow
6. Update documentation
7. Publish new version

## Questions for Review

1. Should we implement token refresh in the relay service?
2. Do we need analytics/monitoring beyond Railway's built-in tools?
3. Should we support multiple Facebook apps (multi-tenancy)?
4. Do we want to rate limit per user or per IP?

---

*This document serves as the implementation specification for adding OAuth relay service support to the Facebook Ads MCP Server, enabling it to work with Facebook Live Apps and removing the barrier for public adoption.*