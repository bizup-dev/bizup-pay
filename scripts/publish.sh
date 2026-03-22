#!/bin/bash
set -e

echo "Building all packages..."
npm run build

echo ""
echo "Running tests..."
npm test

echo ""
echo "Publishing packages (in dependency order)..."
npm publish --workspace=packages/core
npm publish --workspace=packages/morning
npm publish --workspace=packages/cardcom
npm publish --workspace=packages/icount
npm publish --workspace=packages/grow
npm publish --workspace=packages/client
npm publish --workspace=packages/mock-server

echo ""
echo "Done! All @bizup-pay/* packages published to npm."
echo ""
echo "CDN URLs (available after npm propagation):"
echo "  https://unpkg.com/@bizup-pay/client/dist/bizup-pay.min.js"
echo "  https://cdn.jsdelivr.net/npm/@bizup-pay/client/dist/bizup-pay.min.js"
