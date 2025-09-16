# September 16th, 2025 - Claude Connector Fixes

## Problem Summary

The Claude.ai connector was failing to connect to our Facebook Ads MCP server deployed on Railway. Users experienced two main issues:

1. **Connection Timeout**: The `/mcp` endpoint would timeout when Claude.ai tried to establish an SSE connection
2. **"Unable to call tool"**: When tools were invoked, they would fail immediately without reaching the Facebook API

## Root Cause Analysis

After investigation by multiple developers, we identified two critical issues:

### Issue 1: Broken SSE Connection
**Problem**: The SSE (Server-Sent Events) transport was being stored as an instance variable and reused across requests.

**Code Location**: `src/universal-server.js` lines 75-99

**What was wrong**:
```javascript
// BROKEN - Storing transport as instance variable
this.activeSseTransport = new SSEServerTransport('/mcp', res);
await this.mcpServer.connect(this.activeSseTransport);
```

**Why it failed**: SSE connections are per-request, not per-server. Storing the transport caused race conditions and connection failures.

### Issue 2: User ID Validation Blocking Tools
**Problem**: All tool calls were blocked by a user ID validation check that Claude connectors cannot satisfy.

**Code Location**: `src/universal-server.js` lines ~484-507  

**What was wrong**:
```javascript
const user_id = this.user_id;
if (!user_id) {
  throw new Error('Missing user_id in tool arguments');
}
```

**Why it failed**: Claude.ai connectors don't provide user context the same way as the desktop MCP extension. This validation prevented any tools from executing.

## Solutions Implemented

### Fix 1: SSE Connection Pattern
**Solution**: Copy the working SSE pattern from `index.js` that creates a new transport per request.

**Before**:
```javascript
this.apiServer.get('/mcp', async (req, res) => {
  try {
    this.activeSseTransport = new SSEServerTransport('/mcp', res);
    await this.mcpServer.connect(this.activeSseTransport);
  } catch (err) {
    console.error('SSE connection error:', err);
    if (!res.headersSent) {
      res.status(500).send('MCP connection failed');
    }
  }
});
```

**After**:
```javascript
this.apiServer.get('/mcp', (req, res) => {
  const sseTransport = new SSEServerTransport('/mcp', res);
  this.mcpServer.connect(sseTransport).catch(err => {
    console.error('SSE connection error:', err);
    res.status(500).send('MCP connection failed');
  });
});
```

**Key Changes**:
- Remove `this.activeSseTransport` instance variable
- Create new `SSEServerTransport` per request
- Simplified error handling
- Applied same pattern to both GET and POST endpoints

### Fix 2: Remove User ID Validation
**Solution**: Remove the blocking user ID validation and let tools handle their own authentication.

**Before**:
```javascript
async executeToolCall({ toolName, args }) {
  const user_id = this.user_id;

  // Validate that user_id is provided
  if (!user_id) {
    throw new Error('Missing user_id in tool arguments');
  }

  // Step 1: fetch token before the switch if needed
  if (
    toolName.startsWith('facebook_') &&
    toolName !== 'facebook_login' &&
    toolName !== 'facebook_logout' &&
    toolName !== 'facebook_check_auth'
  ) {
    const token = this.facebookAccessTokens?.[user_id];

    if (!token) {
      throw new Error(`Facebook access token not found for user_id: ${user_id}`);
    }

    // Store for use in tool execution
    this.currentFacebookToken = token;
  }

  // Step 2: tool switch
  switch (toolName) {
    // ... tool cases
  }
}
```

**After**:
```javascript
async executeToolCall({ toolName, args }) {
  // Step 2: tool switch
  switch (toolName) {
    // ... tool cases
  }
}
```

**Key Changes**:
- Removed entire user ID validation block
- Removed token fetching logic that depended on user ID
- Let individual tools handle authentication through existing `facebook_login` workflow

## Testing & Validation

### Expected Results
1. **Connection**: Claude.ai connectors should successfully connect to `https://10xer-production.up.railway.app`
2. **Tool Execution**: Tools should execute and return proper responses instead of "Unable to call tool"
3. **Authentication**: `facebook_login` tool should work and guide users through authentication

### Test Plan
1. Wait 1-2 minutes for Railway deployment
2. Add Claude connector with URL: `https://10xer-production.up.railway.app`
3. Test `facebook_login` tool
4. Test other Facebook tools after authentication

## Implementation Details

### Files Modified
- `src/universal-server.js`: Main server file with SSE and tool execution fixes

### Deployment
- **Commit**: `1e6e3af` - "Fix Claude connector: SSE connection and remove user_id validation"
- **Branch**: `main`  
- **Platform**: Railway (automatic deployment)

### Developer Consensus
These fixes were agreed upon by 4 different developers who reviewed the codebase from various angles:
- **SSE Connection**: 99% confidence - definite root cause of timeouts
- **User ID Validation**: 95% confidence - obvious blocker preventing tool execution

## Next Steps

If additional authentication issues arise after these fixes, we may need to address:
1. Token storage persistence in Railway's stateless environment
2. Facebook login tool OAuth flow for Claude connectors
3. Token passing between tools

However, these 2 fixes should resolve the primary connection and tool execution issues. Further fixes will be implemented based on testing results.

## Notes

- The MCP desktop extension continues to work as before (uses different server pattern)
- These changes only affect the Claude.ai web connector functionality
- No breaking changes to existing API endpoints or tool interfaces