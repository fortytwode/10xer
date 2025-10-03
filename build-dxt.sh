#!/bin/bash

# Build DXT file for Claude Desktop
echo "🔨 Building DXT file..."

# Remove old DXT if it exists
if [ -f "10xer_updated.dxt" ]; then
    rm 10xer_updated.dxt
    echo "Removed old DXT file"
fi

# Create temporary directory
mkdir -p temp_dxt

# Copy all necessary files (excluding node_modules, .git, etc.)
echo "📦 Copying source files..."
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='*.dxt' \
          --exclude='temp_dxt' \
          --exclude='.env' \
          --exclude='*.log' \
          --exclude='debug-*.js' \
          --exclude='manual-test.js' \
          . temp_dxt/

# Create the DXT (ZIP) file
echo "🗜️  Creating DXT archive..."
cd temp_dxt
zip -r ../10xer_updated.dxt . -x "*.DS_Store"
cd ..

# Clean up
rm -rf temp_dxt

echo "✅ DXT file created: 10xer_updated.dxt"
echo ""
echo "📋 Next steps:"
echo "1. Upload 10xer_updated.dxt to Claude Desktop settings"
echo "2. Restart Claude Desktop"
echo "3. Test the monthly breakdown functionality"
