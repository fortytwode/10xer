# Creative Insights and Updates Specification

## Overview

This document outlines the specification for a unified creative insights tool that combines ad performance metrics with visual creative assets in the Facebook Ads MCP.

## Goal

Create a single MCP tool that displays creative assets (image/video thumbnails, copy, headlines) alongside ad performance metrics (CTR, spend, impressions, etc.) so users can visually interpret ad performance.

## Current State

### Existing Tools (To Be Consolidated)

1. **Ad Thumbnails Retrieval** (`get-ad-thumbnails-embedded.js`)
   - Successfully retrieves thumbnails from Facebook ads
   - Three fallback methods for image retrieval (thumbnail_url, image_url, image_hash)
   - Embedded image functionality with base64 encoding
   - Caching system with configurable duration (1-168 hours)

2. **Creative Performance Analysis** (`get-ad-creatives.js`)
   - Filters high-performing creatives based on conversion metrics
   - Includes comprehensive performance data (spend, purchases, cost per purchase, CTR)
   - Detects creative types (image, video, carousel)

## Unified Tool Architecture

### Tool Name
`get_ad_insights_with_creatives`

### Single Tool Approach
Combine the best elements of both existing tools into one cohesive tool that:
- Makes a single API call to Facebook for both insights and creative data
- Returns structured JSON data for Claude to render
- Maintains image caching and embedding capabilities
- Extracts all creative text elements (headline, body, CTA)

### API Endpoints Used

1. **Combined Ads Endpoint**
   ```
   GET /act_{ad_account_id}/ads
   Fields: id, name, status, creative{...}, insights{...}
   ```

2. **Batch Creative Details** (if needed)
   ```
   GET /{creative-id}?fields=thumbnail_url,image_url,object_story_spec,asset_feed_spec
   ```

### Response Structure

```json
{
  "ads": [
    {
      "ad_id": "12345",
      "ad_name": "Summer Campaign",
      "status": "ACTIVE",
      "metrics": {
        "impressions": 10000,
        "clicks": 250,
        "spend": 34.56,
        "ctr": 1.25,
        "conversions": 12,
        "cost_per_conversion": 2.88
      },
      "creative": {
        "id": "67890",
        "type": "image",
        "headline": "Get Better Sleep",
        "body": "Try our new app for deep rest.",
        "call_to_action": "INSTALL_NOW",
        "thumbnail_url": "https://...",
        "thumbnail_base64": "data:image/jpeg;base64,..." 
      }
    }
  ]
}

## Implementation Details

### Schema Definition

Add to `tool-schemas.js`:
```javascript
facebook_get_ad_insights_with_creatives: {
  type: 'object',
  properties: {
    act_id: { type: 'string', pattern: '^act_\\d+$' },
    date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'last_30d', 'last_60d', 'last_90d'] },
    limit: { type: 'number', default: 25, maximum: 100 },
    image_format: { type: 'string', enum: ['url', 'base64'], default: 'url' },
    fields: { type: 'array', items: { type: 'string' }, default: ['impressions', 'clicks', 'spend', 'ctr', 'actions'] },
    min_impressions: { type: 'number', default: 0 },
    cache_duration_hours: { type: 'number', default: 24, minimum: 1, maximum: 168 }
  },
  required: ['act_id']
}
```

### Key Functions to Implement

1. **Main Entry Point**
   - Validate parameters
   - Make single API call with field expansion
   - Process and return structured data

2. **Creative Text Extraction**
   - Extract from `object_story_spec` (standard creatives)
   - Extract from `asset_feed_spec` (dynamic creatives)
   - Fallback handling for missing data

3. **Image Processing**
   - Reuse existing image download/embed logic
   - Maintain caching mechanism
   - Support both URL and base64 formats

4. **Performance Metrics Processing**
   - Extract standard metrics (impressions, clicks, CTR)
   - Calculate derived metrics (cost per conversion)
   - Handle conversion action types

### Technical Considerations

- **Single API Call**: Use Facebook's field expansion to get all data in one request
- **Batch Processing**: Handle up to 100 ads efficiently
- **Error Handling**: Graceful fallbacks for missing creative data
- **Response Format**: Pure JSON data for Claude to render

## Future Enhancements

1. **Creative Fatigue Detection** - Track performance trends over time
2. **A/B Test Comparison** - Compare creative variants
3. **Automated Recommendations** - ML-based optimization suggestions
4. **Creative History** - Version tracking and performance history

## Conclusion

This unified tool approach simplifies the user experience by providing all creative and performance data in a single call, allowing Claude to generate rich visual dashboards with the complete context needed for marketing analysis.