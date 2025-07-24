# Embedded Images Feature

The **Facebook Ads Universal Server v2.1.0** introduces a revolutionary **Embedded Images** feature that completely solves the inline image display issues across all platforms.

## 🎯 Problem Solved

**Before:** Image URLs that might not display inline or work across different LLM integrations

**After:** Images are downloaded, cached, and embedded directly as Data URIs in the response

## 🚀 New Tool: `facebook_get_ad_thumbnails_embedded`

### Key Features:

✅ **Downloads & Embeds Images** - Converts external URLs to embedded Data URIs  
✅ **Smart Caching** - 24-hour cache (configurable 1-168 hours)  
✅ **Size Limits** - Configurable max image size (0.1-10MB, default: 5MB)  
✅ **Cross-Platform** - Works reliably across MCP, OpenAI, Gemini  
✅ **Offline Capable** - No external URL dependencies once cached  
✅ **CDN Resilient** - Normalizes Facebook CDN variations for effective caching  

### Usage Examples:

#### Basic Usage:
```json
{
  "ad_ids": ["120230959651980230"],
  "resolution": "all"
}
```

#### Advanced Usage:
```json
{
  "ad_ids": ["120230959651980230", "120230959651980231"],
  "resolution": "full",
  "include_ad_details": true,
  "cache_duration_hours": 48,
  "max_image_size_mb": 3
}
```

## 📊 Performance Benefits

### Cache Efficiency:
- **First Request**: Downloads and caches images
- **Subsequent Requests**: Instant response from cache
- **Cache Hits**: Dramatically faster response times

### Example Output:
```
📊 Processing Summary:
• Total Images Embedded: 2
• Total Size: 133.7KB
• Cache Hits: 2/2
• Cache Directory: ./cache/images/
```

### Size Management:
- **Automatic compression** for web display
- **Size warnings** for large images
- **Configurable limits** to prevent memory issues

## 🔧 Configuration Options

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `ad_ids` | array | 1+ IDs | Required | Facebook ad IDs to process |
| `resolution` | enum | thumbnail/full/all | all | Image resolution preference |
| `include_ad_details` | boolean | true/false | true | Include creative details |
| `cache_duration_hours` | number | 1-168 | 24 | Cache lifetime in hours |
| `max_image_size_mb` | number | 0.1-10 | 5 | Max download size in MB |

## 🏗️ Technical Implementation

### Cache System:
```
./cache/images/
├── abc123def456...json  # Cached image data
├── 789xyz012...json     # Another cached image
└── ...
```

### Cache File Format:
```json
{
  "type": "full_image",
  "source": "direct_image", 
  "data_uri": "data:image/jpeg;base64,/9j/4AAQ...",
  "mime_type": "image/jpeg",
  "size_bytes": 135699,
  "cached_at": "2025-07-01T09:26:15.123Z",
  "original_url": "https://scontent-lga3-1.xx.fbcdn.net/..."
}
```

### CDN Normalization:
- Handles Facebook's rotating CDN servers
- Ensures consistent cache keys
- Reduces redundant downloads

## 🌍 Cross-Platform Compatibility

### MCP (Claude Desktop):
```bash
facebook-ads-mcp
# Use: facebook_get_ad_thumbnails_embedded
```

### OpenAI Function Calling:
```bash
POST http://localhost:3003/openai/functions
{
  "function_call": {
    "name": "facebook_get_ad_thumbnails_embedded",
    "arguments": "{\"ad_ids\":[\"120230959651980230\"]}"
  }
}
```

### Gemini Function Calling:
```bash
POST http://localhost:3003/gemini/functions
{
  "function_call": {
    "name": "facebook_get_ad_thumbnails_embedded",
    "args": {"ad_ids": ["120230959651980230"]}
  }
}
```

## 🎨 Response Format

### Text Summary:
```
🖼️ Ad Thumbnails Retrieved (Embedded)

**1. Akiflow_Jun13_Display_Organization_9AM_V4**
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
```

### Embedded Data:
- Each image becomes a `data:image/jpeg;base64,/9j/4AAQ...` URI
- Ready for immediate display in any context
- No external dependencies

## 🚀 Migration Guide

### From Regular Thumbnails:
```json
// OLD: facebook_get_ad_thumbnails
{
  "ad_ids": ["123456789"]
}

// NEW: facebook_get_ad_thumbnails_embedded  
{
  "ad_ids": ["123456789"],
  "cache_duration_hours": 24
}
```

### Benefits of Migration:
- ✅ **Guaranteed Image Display** - No more broken image URLs
- ✅ **Faster Subsequent Requests** - Cache-powered performance
- ✅ **Better User Experience** - Instant inline images
- ✅ **Platform Independence** - Works everywhere

## 💡 Best Practices

### For High-Volume Usage:
```json
{
  "cache_duration_hours": 48,
  "max_image_size_mb": 2,
  "resolution": "thumbnail"
}
```

### For High-Quality Display:
```json
{
  "cache_duration_hours": 168,
  "max_image_size_mb": 10,
  "resolution": "full"
}
```

### For Mixed Usage:
```json
{
  "cache_duration_hours": 24,
  "max_image_size_mb": 5,
  "resolution": "all"
}
```

## 🔄 Cache Management

### Automatic Cleanup:
- Expired cache files are replaced automatically
- No manual maintenance required

### Manual Cache Reset:
```bash
rm -rf ./cache/images/*
```

### Cache Statistics:
- Monitor cache hit rates in tool responses
- Optimize cache duration based on usage patterns

---

**The Embedded Images feature represents a major leap forward in reliability and user experience for Facebook Ads thumbnail retrieval across all LLM platforms!** 🎉