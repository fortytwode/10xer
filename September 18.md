# Claude.ai Connector Integration Issue - September 18, 2025

## Problem Statement

**Objective**: Convert a working MCP (Model Context Protocol) server for Facebook Ads to be Claude.ai web connector compatible.

**Current Status**: The server works perfectly with Claude Desktop extension but fails when users try to add it as a custom connector in the Claude.ai web interface.

**User Experience**:
- ✅ Connector appears in Claude.ai settings with "Configure" button
- ❌ Configuration page shows "No tools available" 
- ❌ Cannot enable/toggle the connector

## Technical Architecture

### Current Working System
- **MCP Server**: Facebook Ads tool server using @modelcontextprotocol/sdk ^1.17.3
- **Deployment**: Railway.app at `https://10xer-production.up.railway.app`
- **Transport**: Server-Sent Events (SSE) + HTTP POST for MCP protocol
- **Tools**: 9 Facebook Ads tools (login, list accounts, insights, etc.)

### Expected Claude.ai Integration
- Custom connector via manifest discovery
- REST API or MCP protocol communication
- Tool enumeration and execution in Claude.ai chat interface

## Root Cause Analysis

### Initial Diagnosis Process
1. **Railway Deployment Issues** (RESOLVED)
   - Fixed railway.json to use correct server file
   - Updated start command: `SERVER_MODE=api node src/universal-server.js`

2. **Protocol Version Mismatch** (RESOLVED)
   - Updated from "2024-11-05" to "2025-06-18" to match Claude.ai expectations
   - Added proper MCP initialization handling

3. **Transport Protocol Issues** (PARTIALLY RESOLVED)
   - Added GET /mcp endpoint for SSE connections
   - Implemented proper JSON-RPC responses

4. **Manifest Schema Validation** (TESTED BUT NOT ROOT CAUSE)
   - Created 6 test variants of manifest format
   - All variants passed validation but still failed in Claude.ai

### Critical Discovery: Request Flow Analysis

**Using comprehensive request logging**, we identified Claude.ai's actual behavior:

1. ✅ `GET /manifest.json` - Fetches connector manifest (SUCCESS)
2. ✅ `POST /mcp` - MCP initialization with proper JSON-RPC (SUCCESS)  
3. ❌ **CRITICAL**: `POST /manifest.json` - Claude.ai tries to send MCP requests to manifest URL

**Evidence from Railway logs**:
```
🔍 [2025-09-18T07:24:15.079Z] GET /test-manifest/current
🚨 POTENTIAL CLAUDE.AI REQUEST DETECTED! 🚨

🔍 [2025-09-18T07:25:18.547Z] POST /test-manifest/current
🔍 Body: {
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-ai",
      "version": "0.1.0"
    }
  }
}
```

**Root Cause**: Claude.ai expects the manifest URL to handle BOTH:
- GET requests: Return manifest JSON
- POST requests: Handle MCP protocol communication

## Solutions Attempted

### 1. Infrastructure Fixes ✅
**Problem**: Railway deployment and server configuration
**Solution**: 
- Fixed `railway.json` start command
- Corrected server entry point
- Added proper CORS and middleware

### 2. Protocol Compatibility ✅
**Problem**: MCP protocol version mismatch
**Solution**:
- Updated protocol version to "2025-06-18"
- Added proper MCP handlers for initialize, tools/list, tools/call
- Implemented notifications/initialized handler

### 3. REST API Approach ✅
**Problem**: Thought Claude.ai expected REST instead of MCP
**Solution**:
- Created individual REST endpoints for each tool
- Updated manifest to point to /tools/* endpoints
- Added REST wrappers around MCP tool functions

### 4. Manifest Schema Testing ✅
**Problem**: Suspected manifest format issues
**Solution**:
- Created 6 manifest variants (current, mcp, strict, oauth, versioned, minimal)
- Added dynamic testing endpoints
- Validated all schemas with curl

### 5. Connection Flow Simulation ✅
**Problem**: Unable to debug Claude.ai's actual requests
**Solution**:
- Built comprehensive Claude.ai simulator
- Added real-time request logging
- Monitored Railway logs during connection attempts

### 6. Dual Protocol Handler (CURRENT FIX) ⚠️
**Problem**: Claude.ai POSTs MCP requests to manifest URL
**Solution**:
```javascript
// Handle both GET (manifest) and POST (MCP) on same URL
this.apiServer.post('/test-manifest/:variant', async (req, res) => {
  const message = req.body;
  
  if (message.method === 'initialize') {
    res.json({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "facebook-ads-test", version: "1.0.0" }
      }
    });
  } else if (message.method === 'tools/list') {
    const tools = this.adapters.mcp.getToolDefinitions(TOOL_SCHEMAS);
    res.json({
      jsonrpc: "2.0",
      id: message.id,
      result: { tools }
    });
  }
  // ... other MCP methods
});
```

## Current Status

### What Works ✅
- Manifest discovery and parsing
- MCP protocol initialization 
- Tools enumeration (9 tools returned)
- Server stability after restart

### What Doesn't Work ❌
- Claude.ai still shows "No tools available"
- Cannot enable connector toggle
- Tools don't appear in chat interface

### Test Results
```bash
# Manifest GET works
curl https://10xer-production.up.railway.app/test-manifest/current
# Returns: {"name":"10xer-test","description":"Test manifest"...}

# MCP POST works  
curl -X POST https://10xer-production.up.railway.app/test-manifest/current \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize"...}'
# Returns: {"jsonrpc":"2.0","id":0,"result":{"protocolVersion":"2025-06-18"...}}

# Tools list works
curl -X POST https://10xer-production.up.railway.app/test-manifest/current \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Returns: {"jsonrpc":"2.0","id":1,"result":{"tools":[...9 tools...]}}
```

## Possible Next Directions

### 1. Authentication Flow Investigation
**Hypothesis**: Claude.ai expects OAuth2/auth flow even for "none" connection type
**Evidence**: Logs show requests to `/.well-known/oauth-*` endpoints and `/register`
**Test**: 
- Implement minimal OAuth2 endpoints
- Test with connection type "oauth2" instead of "none"

### 2. Manifest Format Deep Dive
**Hypothesis**: Missing required fields in manifest beyond basic validation
**Evidence**: Working connectors may have different manifest structure
**Test**:
- Analyze actual working connector manifest (e.g., GoMarble)
- Compare field-by-field differences
- Test minimal working manifest

### 3. Connection Timing Issues
**Hypothesis**: Claude.ai has strict timeout/retry logic
**Evidence**: Multiple repeated requests in logs, container restarts
**Test**:
- Add persistent connection handling
- Implement proper error responses for unsupported methods
- Add connection keep-alive

### 4. Tool Schema Format Issues  
**Hypothesis**: Tool definitions don't match Claude.ai expectations
**Evidence**: Tools list returns successfully but UI shows "No tools available"
**Test**:
- Simplify tool schemas to minimal format
- Test with single tool instead of 9
- Validate inputSchema format against Claude.ai requirements

### 5. URL Pattern Investigation
**Hypothesis**: Claude.ai expects specific URL patterns/paths
**Evidence**: Current test URL may not match Claude.ai conventions
**Test**:
- Try production manifest URL: `/manifest.json` with same dual handler
- Test with standard paths like `/mcp` or `/api/mcp`

## Debugging Tools Created

1. **claude-ai-simulator.js** - Complete simulation of Claude.ai connection flow
2. **connection-monitor.js** - Real-time request monitoring
3. **test-manifest-validation.js** - Manifest schema validation
4. **Dynamic test endpoints** - `/test-manifest/:variant` for A/B testing

## Files Modified

- `src/universal-server.js` - Added dual protocol handlers
- `src/claude-connector-manifest.js` - Updated manifest format
- `railway.json` - Fixed deployment configuration
- Added comprehensive logging and monitoring

## Recommended Next Steps

1. **Immediate**: Test with production manifest URL instead of test URL
2. **Authentication**: Implement basic OAuth2 endpoints to handle auth discovery
3. **Simplification**: Test with single tool manifest to isolate schema issues
4. **Comparative Analysis**: Get working connector example and diff against our implementation

## Developer Handoff Notes

- All test infrastructure is in place for rapid iteration
- Railway logs provide real-time debugging
- Curl tests validate server functionality 
- Issue is isolated to Claude.ai UI layer, not server communication
- Consider that Claude.ai connector system may have undocumented requirements beyond public API specs