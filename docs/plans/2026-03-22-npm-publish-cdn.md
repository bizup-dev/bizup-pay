# npm Publish + CDN Hosting — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish all @bizup-pay/* packages to npm and host a browser bundle on CDN for script-tag usage.

**Architecture:** npm workspaces publish in dependency order (core first). Client package gets an additional esbuild step to produce `bizup-pay.min.js` IIFE bundle. CDN comes free via unpkg/jsdelivr once on npm.

**Tech Stack:** npm workspaces, esbuild (bundler), unpkg/jsdelivr (CDN)

---

### Task 1: Prepare package.json files for publishing

**Files to modify:** All 7 `packages/*/package.json`

For each package, add/verify these fields:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": { "access": "public" }
}
```

Packages and their names:
- `packages/core/package.json` → `@bizup-pay/core`
- `packages/morning/package.json` → `@bizup-pay/morning`
- `packages/cardcom/package.json` → `@bizup-pay/cardcom`
- `packages/icount/package.json` → `@bizup-pay/icount`
- `packages/grow/package.json` → `@bizup-pay/grow`
- `packages/client/package.json` → `@bizup-pay/client`
- `packages/mock-server/package.json` → `@bizup-pay/mock-server`

Set initial version `0.1.0` across all packages.

Verify `dependencies` point to `"@bizup-pay/core": "0.1.0"` (not `"workspace:*"`).

---

### Task 2: Build client browser bundle

**Files:**
- Modify: `packages/client/package.json` (add esbuild + build:bundle script)
- Create: `packages/client/build.mjs` (esbuild config)

**Step 1: Install esbuild**

```bash
npm install -D esbuild --workspace=packages/client
```

**Step 2: Add bundle build script to client/package.json**

```json
{
  "scripts": {
    "build:bundle": "node build.mjs"
  }
}
```

**Step 3: Create build.mjs**

```javascript
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'BizupPay',
  outfile: 'dist/bizup-pay.min.js',
  target: 'es2020',
  external: ['@bizup-pay/core'],
})
```

Note: `@bizup-pay/core` types are compile-time only for the client — the bundle should inline the type references but the client doesn't actually import runtime code from core. Test whether `external` is needed or if it should be bundled.

**Step 4: Test with plain HTML**

```html
<!DOCTYPE html>
<html>
<body>
  <div id="pay"></div>
  <script src="dist/bizup-pay.min.js"></script>
  <script>
    console.log(typeof BizupPay.BizupPay) // should be 'function'
  </script>
</body>
</html>
```

**Step 5: Add `dist/bizup-pay.min.js` to the `files` array in package.json**

Already covered by `"files": ["dist"]`.

---

### Task 3: Create publish script

**Files:**
- Create: `scripts/publish.sh`

```bash
#!/bin/bash
set -e

echo "Building all packages..."
npm run build

echo "Building client bundle..."
npm run build:bundle --workspace=packages/client

echo "Publishing packages (in dependency order)..."
npm publish --workspace=packages/core
npm publish --workspace=packages/morning
npm publish --workspace=packages/cardcom
npm publish --workspace=packages/icount
npm publish --workspace=packages/grow
npm publish --workspace=packages/client
npm publish --workspace=packages/mock-server

echo "Done! Packages published to npm."
echo ""
echo "CDN URLs (available after npm propagation):"
echo "  https://unpkg.com/@bizup-pay/client/dist/bizup-pay.min.js"
echo "  https://cdn.jsdelivr.net/npm/@bizup-pay/client/dist/bizup-pay.min.js"
```

Make executable: `chmod +x scripts/publish.sh`

---

### Task 4: Update README with CDN usage

Add to README after the iframe/modal examples:

```markdown
### Script Tag (CDN)

No build tools required — load directly from CDN:

\```html
<script src="https://unpkg.com/@bizup-pay/client/dist/bizup-pay.min.js"></script>
<script>
  const bizupPay = new BizupPay.BizupPay()

  // After fetching session from your server:
  bizupPay.mount(session, document.getElementById('payment'), {
    onSuccess: () => window.location.href = '/thank-you',
    onFailure: (e) => alert(e.message),
  })
</script>
\```
```

---

### Task 5: Publish to npm

**Pre-requisites:**
- npm account with `@bizup-pay` org created at https://www.npmjs.com/org/create
- Run `npm login` and verify with `npm whoami`

**Steps:**
1. Run `./scripts/publish.sh`
2. Verify packages at https://www.npmjs.com/org/bizup-pay
3. Test CDN URL: `curl https://unpkg.com/@bizup-pay/client/dist/bizup-pay.min.js | head -1`

---

### Task 6 (Optional): Cloudflare custom CDN domain

Only needed if you want `cdn.bizup.co.il` instead of unpkg.

**Options:**
- **Cloudflare Pages**: Create pages project, deploy `dist/bizup-pay.min.js`, bind to custom domain
- **Cloudflare R2**: Upload to R2 bucket with public access, bind custom domain
- **Cloudflare Worker**: Proxy unpkg with caching at custom domain

Recommendation: Start with unpkg (free, zero setup). Add custom domain later.

---

### Summary

| Step | What | Result |
|------|------|--------|
| 1 | Prepare package.json | All packages ready for npm |
| 2 | Build browser bundle | `bizup-pay.min.js` for script tag |
| 3 | Publish script | One command to publish all |
| 4 | Update README | CDN usage docs |
| 5 | npm publish | Packages live on npm |
| 6 | Custom CDN (optional) | `cdn.bizup.co.il` |
