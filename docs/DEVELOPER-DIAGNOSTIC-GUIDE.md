# Facebook Ads MCP Server - Image Display Diagnostic Guide

## 🎯 Project Context & Purpose

### What We Built
This is a **Universal Facebook Ads Server** that provides Facebook Ads API access through three different protocols:

1. **MCP (Model Context Protocol)** - For Claude Desktop integration
2. **OpenAI Function Calling** - For GPT-4/GPT-3.5-turbo integration  
3. **Gemini Function Calling** - For Google AI integration

### The Core Problem We're Solving
**Image Display Reliability Across LLM Platforms**

When Facebook Ad thumbnails are retrieved via the Graph API, they return as external URLs (e.g., `https://scontent-lga3-1.xx.fbcdn.net/...`). However, these URLs often fail to display inline across different LLM integrations due to:

- CORS restrictions
- CDN server variations
- External URL blocking policies
- Platform-specific image handling

### Our Solution: Embedded Images
Instead of returning image URLs, our system:
1. **Downloads** images from Facebook's CDN
2. **Converts** them to Base64 Data URIs (`data:image/jpeg;base64,/9j/4AAQ...`)
3. **Caches** them locally for performance
4. **Embeds** them directly in responses

This ensures **100% reliability** across all platforms with no external dependencies.

---

## 🏗️ Technical Architecture

### File Structure
```
src/
├── tools/
│   └── get-ad-thumbnails-embedded.js  # Main embedded images implementation
├── universal-server.js                # Multi-protocol server
├── adapters/
│   ├── mcp-adapter.js                 # Claude Desktop format
│   ├── openai-adapter.js              # OpenAI format
│   └── gemini-adapter.js              # Gemini format
├── utils/
│   ├── facebook-api.js                # Facebook Graph API client
│   └── validation.js                  # Input validation schemas
└── schemas/
    └── tool-schemas.js                # Tool parameter definitions
```

### Function Consolidation (IMPORTANT)
**We consolidated the redundant functions:**
- ❌ `facebook_get_ad_thumbnails` (old - returned URLs only)
- ✅ `facebook_get_ad_thumbnails` (new - embedded images with caching)

The function name remains the same, but the implementation now uses embedded images.

---

## 🔍 How Embedded Images Work

### Image Download & Processing Flow
```javascript
// 1. Generate cache key from normalized URL
const normalizedUrl = imageUrl.replace(/scontent-[^.]+\./, 'scontent-xxx.');
const cacheKey = crypto.createHash('sha256').update(normalizedUrl + imageInfo.type).digest('hex');

// 2. Check cache first
const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
if (cacheExists && !expired) {
  return cachedDataURI;
}

// 3. Download with size limits
const response = await axios.get(imageUrl, {
  responseType: 'arraybuffer',
  maxContentLength: maxImageSizeMB * 1024 * 1024,
  timeout: 15000
});

// 4. Convert to Data URI
const base64 = Buffer.from(response.data).toString('base64');
const dataURI = `data:${mimeType};base64,${base64}`;

// 5. Cache for future requests
await fs.writeFile(cacheFile, JSON.stringify({
  data_uri: dataURI,
  mime_type: mimeType,
  size_bytes: buffer.length,
  cached_at: new Date().toISOString()
}));
```

### Cache System
- **Location**: `./cache/images/`
- **Format**: JSON files with SHA256 filenames
- **Duration**: Configurable 1-168 hours (default: 24h)
- **Size Limits**: 0.1-10MB per image (default: 5MB)

---

## 🐛 Diagnostic Steps

### 1. Test Basic Functionality
```bash
# Test MCP directly
cd /path/to/facebook-ads-mcp
node test-embedded.js

# Expected output:
# ✅ Tool executed successfully
# 🖼️ Ad Thumbnails Retrieved (Embedded)
# • Total Images Embedded: X
# • Cache Hits: X/X
```

### 2. Test Multi-Protocol Server
```bash
# Start universal server
FACEBOOK_ALLOW_HARDCODED_TOKEN=true SERVER_MODE=api PORT=3003 node src/universal-server.js

# Test OpenAI endpoint
curl -X POST http://localhost:3003/openai/functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_call": {
      "name": "facebook_get_ad_thumbnails",
      "arguments": "{\"ad_ids\":[\"YOUR_AD_ID\"]}"
    }
  }'

# Test Gemini endpoint  
curl -X POST http://localhost:3003/gemini/functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_call": {
      "name": "facebook_get_ad_thumbnails", 
      "args": {"ad_ids": ["YOUR_AD_ID"]}
    }
  }'
```

### 3. Verify Image Data Format
Look for this in responses:
```json
{
  "embedded_images": [{
    "type": "thumbnail",
    "data_uri": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "mime_type": "image/jpeg", 
    "size_bytes": 1234,
    "cached_at": "2025-07-01T09:26:15.123Z"
  }]
}
```

### 4. Check Cache Directory
```bash
ls -la ./cache/images/
# Should show .json files with SHA256 names like:
# abc123def456789...json
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Images Not Displaying"
**Symptoms**: Response contains Data URIs but images don't show

**Diagnosis**:
```bash
# Check if Data URI is valid
node -e "
const response = require('./test-response.json');
const dataUri = response.embedded_images[0].data_uri;
console.log('Data URI prefix:', dataUri.substring(0, 50));
console.log('Data URI length:', dataUri.length);
console.log('Is valid base64:', /^data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+$/.test(dataUri));
"
```

**Solutions**:
- Verify Data URI format: `data:image/jpeg;base64,XXXXX`
- Check MIME type is correct (`image/jpeg`, `image/png`, etc.)
- Ensure Base64 data is valid

### Issue 2: "Cache Misses / Slow Performance"
**Symptoms**: High download times, low cache hit rates

**Diagnosis**:
```bash
# Check cache file structure
find ./cache/images -name "*.json" -exec head -5 {} \;

# Check for CDN normalization issues
grep -r "scontent-" ./cache/images/
```

**Solutions**:
- Verify CDN normalization: `scontent-lga3-1.xx.fbcdn.net` → `scontent-xxx.xx.fbcdn.net`
- Check cache expiration settings
- Monitor file system permissions

### Issue 3: "Download Failures"
**Symptoms**: "Failed to embed image" errors

**Diagnosis**:
```bash
# Test manual download
curl -I "https://scontent-lga3-1.xx.fbcdn.net/v/t45.1600-4/..."

# Check size limits
ls -lh ./cache/images/*.json | awk '{print $5}' | sort -hr
```

**Solutions**:
- Verify Facebook URLs are accessible
- Check `max_image_size_mb` parameter
- Ensure network connectivity

### Issue 4: "Authentication Errors"
**Symptoms**: "Access token required" or 400/401 responses

**Diagnosis**:
```bash
# Check auth status
curl -X POST http://localhost:3003/openai/functions \
  -H "Content-Type: application/json" \
  -d '{"function_call": {"name": "facebook_check_auth", "arguments": "{}"}}'
```

**Solutions**:
- Run `facebook_login` function first
- Verify `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in `.env`
- Check token expiration

---

## 🧪 Testing Procedures

### Unit Test: Single Ad
```javascript
import { getAdThumbnailsEmbedded } from './src/tools/get-ad-thumbnails-embedded.js';

const result = await getAdThumbnailsEmbedded({
  ad_ids: ['YOUR_KNOWN_WORKING_AD_ID'],
  resolution: 'thumbnail',
  cache_duration_hours: 1,
  max_image_size_mb: 2
});

console.log('Embedded images count:', result.content[0].text.match(/Embedded Images \((\d+)\)/)?.[1]);
```

### Integration Test: All Protocols
```bash
# 1. Start server
FACEBOOK_ALLOW_HARDCODED_TOKEN=true SERVER_MODE=api node src/universal-server.js &

# 2. Test each protocol
./test-all-protocols.sh YOUR_AD_ID

# 3. Verify consistent results
diff openai-response.json gemini-response.json
```

### Performance Test: Cache Effectiveness
```javascript
// First request (should download)
const start1 = Date.now();
const result1 = await getAdThumbnailsEmbedded({ad_ids: ['AD_ID']});
const time1 = Date.now() - start1;

// Second request (should use cache)  
const start2 = Date.now();
const result2 = await getAdThumbnailsEmbedded({ad_ids: ['AD_ID']});
const time2 = Date.now() - start2;

console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
console.log(`Cache speedup: ${Math.round(time1/time2)}x faster`);
```

---

## 📊 Expected Behavior

### Successful Response Format
```
🖼️ Ad Thumbnails Retrieved (Embedded)

**1. Your_Ad_Name**
• Ad ID: 120230959651980230
• Creative ID: 1031446212475541  
• Type: image
• 🖼️ Embedded Images (2):
  1. thumbnail (direct_thumbnail)
     📊 Size: 1.2KB | Type: image/jpeg
     🖼️ [Embedded Image Data URI - Ready for Display]
  2. full_image (direct_image)  
     📊 Size: 132.5KB | Type: image/jpeg
     🖼️ [Embedded Image Data URI - Ready for Display]

📊 Processing Summary:
• Total Images Embedded: 2
• Total Size: 133.7KB
• Cache Hits: 2/2  ← Should be 0/2 first time, 2/2 second time
• Cache Directory: ./cache/images/
```

### Performance Benchmarks
- **First Request**: 2-5 seconds (downloading images)
- **Cached Request**: 100-300ms (reading from cache)  
- **Cache Hit Rate**: >90% for repeated requests
- **Image Sizes**: Thumbnails ~1-5KB, Full images ~50-500KB

---

## 🔧 Configuration Options

### Environment Variables
```bash
# Required
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Optional  
FACEBOOK_ALLOW_HARDCODED_TOKEN=true  # For testing only
MCP_SERVER_NAME=facebook-ads-mcp
SERVER_MODE=api  # or 'mcp' or 'both'
PORT=3003
```

### Function Parameters
```javascript
{
  ad_ids: ["123", "456"],           // Required: Ad IDs to process
  resolution: "all",                // thumbnail|full|all
  include_ad_details: true,         // Include creative metadata
  cache_duration_hours: 24,         // 1-168 hours
  max_image_size_mb: 5             // 0.1-10 MB
}
```

---

## 🆘 When to Escalate

Contact the original developer if you encounter:

1. **Fundamental MCP Protocol Issues** - Server not responding to MCP requests
2. **Facebook API Changes** - New authentication requirements or API deprecations  
3. **Architecture Changes Needed** - Additional protocols or major feature requests
4. **Security Concerns** - Token handling or data privacy issues

For other issues, this diagnostic guide should provide sufficient information for debugging and resolution.

---

## 📝 Version Info

- **Current Version**: 2.1.0
- **Node.js Requirement**: >=18.0.0
- **Key Dependencies**: `@modelcontextprotocol/sdk`, `axios`, `express`
- **Last Updated**: 2025-07-01

**Remember**: The embedded images feature is our solution to the core problem of unreliable image display across LLM platforms. If images are still not displaying, the issue is likely in the LLM client's handling of Data URIs, not our server implementation.