# Facebook Ads MCP - Inline Image Display Issue

## 🎯 **Project Context for Developer**

### What This Project Does
This is a **Model Context Protocol (MCP) server** that integrates Facebook Ads API with Claude Desktop. MCP is Anthropic's protocol that allows Claude to call external functions and APIs seamlessly during conversations.

**User Goal**: Chat naturally with Claude about Facebook ads and see ad thumbnails displayed inline during the conversation.

### Architecture Overview
```
Claude Desktop ↔ MCP Protocol ↔ Our Server ↔ Facebook Graph API
```

Our server downloads Facebook ad images, converts them to Base64 Data URIs, and embeds them in responses to ensure cross-platform compatibility.

---

## 🐛 **Current Issue**

**Problem**: User can successfully call the `facebook_get_ad_thumbnails` function through Claude Desktop, but **images are not displaying inline** in the chat interface.

**Expected Behavior**: When user asks "Show me thumbnails for ad ID 120230959651980230", Claude should display the actual images inline in the conversation.

**Current Behavior**: Function executes successfully, returns embedded images, but Claude shows text like `🖼️ [Embedded Image Data URI - Ready for Display]` instead of actual images.

---

## 🔍 **Technical Details**

### How Our Embedded Images Work

1. **Download**: Images fetched from Facebook's CDN
2. **Convert**: Base64 encoded as Data URIs (`data:image/jpeg;base64,/9j/4AAQ...`)
3. **Cache**: Stored locally for performance
4. **Embed**: Returned in MCP response format

### Current Response Format
```javascript
// Our server returns this to Claude via MCP:
{
  content: [{
    type: 'text',
    text: '🖼️ **Ad Thumbnails Retrieved (Embedded)**\n\n**1. Ad Name**\n• Ad ID: 123\n• 🖼️ **Embedded Images (2):**\n  1. **thumbnail**\n     🖼️ [Embedded Image Data URI - Ready for Display]'
  }]
}
```

### Where Images Are Actually Stored
The actual Base64 Data URIs are in the `result.embedded_images` array:
```javascript
result.embedded_images = [{
  type: "thumbnail",
  data_uri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  mime_type: "image/jpeg",
  size_bytes: 1234
}]
```

---

## 🔬 **Diagnostic Steps Needed**

### 1. Verify MCP Image Support
**Question**: Does Claude Desktop's MCP implementation support inline image display?

**Test**: Try returning images in different MCP formats:

#### Option A: Image Content Type
```javascript
{
  content: [{
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: '/9j/4AAQSkZJRgABAQAAAQABAAD...' // Base64 without data: prefix
    }
  }]
}
```

#### Option B: Mixed Content
```javascript
{
  content: [
    {
      type: 'text',
      text: '🖼️ **Ad Thumbnails Retrieved**\n\n**1. Ad Name**'
    },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: '/9j/4AAQSkZJRgABAQAAAQABAAD...'
      }
    }
  ]
}
```

### 2. Check MCP Schema Compliance
**File to examine**: `src/tools/get-ad-thumbnails-embedded.js:377-448`

Our current response format may not match Claude's expected MCP image schema.

### 3. Test Image Size Limits
- Current images: ~1.2KB (thumbnail) and ~132KB (full)
- **Question**: Does Claude have size limits for embedded images?
- **Test**: Try with smaller images

### 4. Verify MIME Types
Our current detection:
```javascript
let mimeType = response.headers['content-type'] || 'image/jpeg';
if (!mimeType.startsWith('image/')) {
  // Fallback logic based on URL extension
}
```

---

## 🧪 **Debugging Code to Try**

### Test 1: Simple Image Response
Modify `formatEmbeddedThumbnailsResponse()` to return:
```javascript
return {
  content: [{
    type: 'image',
    source: {
      type: 'base64',
      media_type: result.embedded_images[0].mime_type,
      data: result.embedded_images[0].data_uri.split(',')[1] // Remove data: prefix
    }
  }]
};
```

### Test 2: Mixed Content Response
```javascript
const content = [{
  type: 'text',
  text: `🖼️ **Ad: ${result.ad_name}**\n• Ad ID: ${result.ad_id}\n`
}];

result.embedded_images.forEach(img => {
  content.push({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mime_type,
      data: img.data_uri.split(',')[1]
    }
  });
});

return { content };
```

### Test 3: URL-Based Images (Fallback)
If Data URIs don't work, try external URLs:
```javascript
{
  content: [{
    type: 'image',
    source: {
      type: 'url',
      url: 'https://scontent-lga3-1.xx.fbcdn.net/...' // Original Facebook URL
    }
  }]
}
```

---

## 📋 **What to Investigate**

### MCP Documentation
1. **Official MCP Spec**: Check if `type: 'image'` is supported in tool responses
2. **Claude Desktop Implementation**: May have specific requirements for image display
3. **Base64 vs URL**: Which format does Claude prefer?

### Testing Approach
1. **Start Simple**: Single image with minimal metadata
2. **Check Logs**: Claude Desktop may show MCP protocol errors
3. **Compare Working Examples**: Look at other MCP servers that display images
4. **Test Incrementally**: Text → Single image → Multiple images

### Files to Modify
- **Primary**: `src/tools/get-ad-thumbnails-embedded.js` (lines 377-448)
- **Response formatting**: `formatEmbeddedThumbnailsResponse()` function
- **Image processing**: `downloadAndEmbedImage()` function (lines 257-328)

---

## 🎯 **Success Criteria**

### Working Solution Should:
1. ✅ Display actual images inline in Claude Desktop chat
2. ✅ Handle both thumbnail and full-size images
3. ✅ Maintain caching for performance
4. ✅ Work reliably across different ad types

### Test Case
```
User: "Show me thumbnails for ad 120230959651980230"
Claude: [Displays actual thumbnail images inline] + text summary
```

---

## 📚 **Reference Links**

- **MCP Protocol Spec**: https://spec.modelcontextprotocol.io/
- **Claude Desktop MCP**: https://claude.ai/docs/mcp
- **MCP Server**: Runs locally via Claude Desktop integration

---

## 🛠️ **Development Environment**

### Quick Start
```bash
git clone [your-repo]
cd facebook-ads-mcp
npm install
node src/index.js  # Start MCP server
```

### Test Function
```bash
node test-embedded.js  # Test image embedding locally
```

### Test MCP Connection
```bash
node src/index.js  # Should show: "Facebook Ads MCP server running on stdio"
```

### Debug Logs
The server logs show successful image processing:
```
🖼️ Fetching and embedding thumbnails for 1 ads
📦 Processing batch 1/1
⬇️ Downloading image: thumbnail from https://external-lga3-1...
💾 Cached image: thumbnail (1.2KB)
```

---

**The core question**: Is this an MCP protocol issue, a Claude Desktop limitation, or our response format? The images are being processed correctly - we just need to find the right way to tell Claude to display them inline.

Let me know what you discover and I can help implement the solution!