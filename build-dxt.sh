#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
project_dir="$PWD"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT
cp manifest.json package.json package-lock.json "$stage_dir/"
cp -R src public "$stage_dir/"
(cd "$stage_dir" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
# Include only the application and its locked dependencies in the extension.
(cd "$stage_dir" && zip -qr "$stage_dir/release.zip" manifest.json package.json src public node_modules -x 'node_modules/.bin/*' '*/.DS_Store')
for bundle in 10xer.dxt 10xer_updated.dxt 10xer_16_10_2025.dxt 10xer_3_10_2025.dxt; do
  cp "$stage_dir/release.zip" "$project_dir/$bundle"
done
# Preserve the original loopback-only backend for the local testing edition.
(cd "$stage_dir" && node --input-type=commonjs -e '
  const fs = require("node:fs");
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  manifest.server.mcp_config.env.SSE_URL = "http://localhost:8000/mcp-api/sse";
  delete manifest.server.mcp_config.env.ACCOUNT_SERVICE_ORIGIN;
  delete manifest.user_config.account_service_origin;
  fs.writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));
' && zip -q "$stage_dir/release.zip" manifest.json)
cp "$stage_dir/release.zip" "$project_dir/10xer_local_code_testing.dxt"
