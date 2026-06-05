#!/bin/bash
# setup-libs.sh — ImgSwift build script for Netlify
# Generates tool pages + injects deploy version into sw.js

set -e

echo "🔨 Running build.js to generate tool pages..."
node build.js

# Inject deploy version into sw.js (using git commit hash or timestamp)
DEPLOY_VERSION="${COMMIT_REF:-$(date +%Y%m%d%H%M%S)}"
echo "🔧 Injecting deploy version: imgswift-${DEPLOY_VERSION}"
sed -i "s/__DEPLOY_VERSION__/${DEPLOY_VERSION}/g" sw.js

echo "✅ Build complete."
