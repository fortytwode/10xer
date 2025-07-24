#!/usr/bin/env node

import { getAdThumbnailsEmbedded } from './src/tools/get-ad-thumbnails-embedded.js';

console.log('🖼️ Testing Embedded Ad Thumbnails Tool...\n');

try {
  const result = await getAdThumbnailsEmbedded({
    ad_ids: ['120230959651980230'],
    resolution: 'all',
    include_ad_details: true,
    cache_duration_hours: 24,
    max_image_size_mb: 2
  });

  console.log('✅ Tool executed successfully\n');
  console.log('📄 Response:');
  console.log(result.content[0].text);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}