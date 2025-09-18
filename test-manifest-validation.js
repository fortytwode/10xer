#!/usr/bin/env node

// Test script to validate manifest schemas like Claude.ai might
import https from 'https';

const variants = ['current', 'mcp', 'strict', 'oauth', 'versioned', 'minimal'];

async function fetchManifest(variant) {
  return new Promise((resolve, reject) => {
    https.get(`https://10xer-production.up.railway.app/test-manifest/${variant}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ variant, data: JSON.parse(data), status: res.statusCode });
        } catch (e) {
          reject({ variant, error: e.message, status: res.statusCode });
        }
      });
    }).on('error', reject);
  });
}

function validateManifest(manifest) {
  const errors = [];
  const warnings = [];
  
  // Required fields check
  if (!manifest.name) errors.push('Missing required field: name');
  if (!manifest.version) errors.push('Missing required field: version');
  if (!manifest.tools || !Array.isArray(manifest.tools)) errors.push('Missing or invalid tools array');
  
  // Tools validation
  if (manifest.tools) {
    manifest.tools.forEach((tool, i) => {
      if (!tool.name) errors.push(`Tool ${i}: missing name`);
      if (!tool.description) errors.push(`Tool ${i}: missing description`);
      if (!tool.inputSchema) errors.push(`Tool ${i}: missing inputSchema`);
      
      // Check for REST API fields
      if (tool.method && !tool.endpoint) warnings.push(`Tool ${i}: has method but no endpoint`);
      if (tool.endpoint && !tool.method) warnings.push(`Tool ${i}: has endpoint but no method`);
      
      // Schema validation
      if (tool.inputSchema && tool.inputSchema.type !== 'object') {
        warnings.push(`Tool ${i}: inputSchema type should be 'object'`);
      }
    });
  }
  
  // Connection validation
  if (manifest.connection) {
    const validTypes = ['none', 'oauth2'];
    if (!validTypes.includes(manifest.connection.type)) {
      warnings.push(`Invalid connection type: ${manifest.connection.type}`);
    }
  }
  
  return { errors, warnings };
}

console.log('🧪 MANIFEST VALIDATION TEST\n');

for (const variant of variants) {
  try {
    const result = await fetchManifest(variant);
    const validation = validateManifest(result.data);
    
    console.log(`📋 ${variant.toUpperCase()} VARIANT:`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Tools: ${result.data.tools?.length || 0}`);
    console.log(`   Connection: ${result.data.connection?.type || 'none'}`);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ Valid manifest`);
    } else {
      console.log(`   ❌ Errors: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`❌ ${variant.toUpperCase()} FAILED:`, error.error || error.message);
    console.log('');
  }
}

console.log('🎯 TESTING COMPLETE - Try each variant URL in Claude.ai connector');