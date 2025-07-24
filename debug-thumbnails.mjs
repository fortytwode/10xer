import { getAdThumbnails } from './src/tools/get-ad-thumbnails.js';

console.log('🔍 Testing ad thumbnails tool...');

try {
  const result = await getAdThumbnails({ 
    ad_ids: ['120230959651980230'], 
    resolution: 'all',
    include_ad_details: true 
  });
  
  console.log('✅ Tool executed successfully');
  console.log('📄 Result structure:');
  console.log(JSON.stringify(result, null, 2));
  
  // Check content items
  if (result.content) {
    console.log(`\n📊 Content items found: ${result.content.length}`);
    result.content.forEach((item, index) => {
      console.log(`${index + 1}. Type: ${item.type}`);
      if (item.type === 'image') {
        console.log(`   Source: ${item.source}`);
        console.log(`   Alt: ${item.alt_text}`);
      }
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}