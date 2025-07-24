import { FacebookAPIClient } from '../utils/facebook-api.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';
import { createErrorResponse } from '../utils/error-handler.js';
import axios from 'axios';

/**
 * Get ad creatives for specific ad IDs
 * Focused tool that only fetches creative assets
 */
export async function getAdCreatives(args) {
  try {
    const validatedArgs = validateParameters(ValidationSchemas.adCreatives, args);
    const { ad_ids, include_images = true } = validatedArgs;

    const facebookAPI = new FacebookAPIClient();
    console.error(`🖼️ Fetching creatives for ${ad_ids.length} ads`);

    // Batch request for efficiency
    const batchRequests = ad_ids.map(adId => ({
      method: 'GET',
      relative_url: `${adId}?fields=id,name,creative{id,image_url,thumbnail_url,object_story_spec{video_data{image_url},link_data{name,message,caption,call_to_action}},asset_feed_spec{images{url},titles{text},bodies{text},call_to_action_types}}`
    }));

    const batchResponse = await facebookAPI.makeBatchRequest(batchRequests);
    const ads = [];

    // Process batch response
    for (let i = 0; i < ad_ids.length; i++) {
      const result = batchResponse[i];
      if (result?.code === 200 && result.body) {
        const adData = JSON.parse(result.body);
        const creative = adData.creative || {};

        const processedAd = {
          ad_id: adData.id,
          ad_name: adData.name,
          creative: {
            id: creative.id,
            type: detectCreativeType(creative),
            image_url: getBestImageUrl(creative),
            headline: extractHeadline(creative),
            body: extractBody(creative),
            call_to_action: extractCTA(creative)
          }
        };

        ads.push(processedAd);
      } else {
        console.error(`Failed to get creative for ad ${ad_ids[i]}: ${result?.code}`);
      }
    }

    // Download and embed images if requested
    if (include_images && ads.length > 0) {
      console.error(`📥 Downloading images for ${ads.length} ads...`);
      
      await Promise.all(ads.map(async (ad) => {
        if (ad.creative.image_url) {
          try {
            const response = await axios.get(ad.creative.image_url, {
              responseType: 'arraybuffer',
              timeout: 5000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FacebookAds/1.0)'
              }
            });
            const base64 = Buffer.from(response.data).toString('base64');
            const mimeType = response.headers['content-type'] || 'image/jpeg';
            ad.creative.image_data = `data:${mimeType};base64,${base64}`;
            console.error(`✅ Downloaded image for ad ${ad.ad_id}`);
          } catch (error) {
            console.error(`❌ Failed to download image for ad ${ad.ad_id}: ${error.message}`);
          }
        }
      }));
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: `Retrieved ${ads.length} ad creatives`,
          ads: ads
        }, null, 2)
      }]
    };

  } catch (error) {
    console.error('Error in getAdCreatives:', error);
    return createErrorResponse(error);
  }
}

// Helper functions
function getBestImageUrl(creative) {
  // Priority: full-size images from various sources
  // 1. Dynamic creative images (usually full resolution)
  if (creative.asset_feed_spec?.images?.[0]?.url) {
    return creative.asset_feed_spec.images[0].url;
  }
  
  // 2. Video thumbnail (full resolution)
  if (creative.object_story_spec?.video_data?.image_url) {
    return creative.object_story_spec.video_data.image_url;
  }
  
  // 3. Direct image_url (may be full or thumbnail)
  if (creative.image_url) {
    return creative.image_url;
  }
  
  // 4. Fallback to thumbnail
  return creative.thumbnail_url;
}

function detectCreativeType(creative) {
  if (creative.object_story_spec?.video_data) return 'video';
  if (creative.asset_feed_spec?.videos?.length > 0) return 'video';
  if (creative.asset_feed_spec?.images?.length > 1) return 'carousel';
  return 'image';
}

function extractHeadline(creative) {
  return creative.object_story_spec?.link_data?.name ||
         creative.asset_feed_spec?.titles?.[0]?.text ||
         null;
}

function extractBody(creative) {
  return creative.object_story_spec?.link_data?.message ||
         creative.asset_feed_spec?.bodies?.[0]?.text ||
         null;
}

function extractCTA(creative) {
  return creative.object_story_spec?.link_data?.call_to_action?.type ||
         creative.asset_feed_spec?.call_to_action_types?.[0] ||
         null;
}