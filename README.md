# Repro: rwsdk causes Vite dep optimizer to resolve lightningcss `../pkg`

This repo demonstrates how using `rwsdk` with the Cloudflare Vite plugin can make Vite's dependency optimizer resolve `lightningcss` and fail with `../pkg` from `lightningcss/node/index.js`.

## Why it fails

- A runtime helper in `rwsdk` imports `vite` at top-level (`dist/lib/normalizeModulePath.mjs`).
- rwsdk's Vite plugins add environment-specific `optimizeDeps.include`, so the optimizer prebundles runtime code that imports `vite`.
- Pulling `vite` into the optimizer graph brings in Vite's Node CSS chunk, which contains `import('lightningcss')`.
- Esbuild resolves that literal import, so it tries to bundle `lightningcss`.
- `lightningcss`'s Node entry has a local fallback `require('../pkg')` (not published), so the optimizer errors with `Could not resolve "../pkg"`.

## Steps

```sh
pnpm install
DEBUG=vite:*,esbuild:* pnpm dev
```

Look for lines like:

- `vite/module-runner -> .../node_modules/vite/dist/node/module-runner.js`
- `lightningcss -> .../node_modules/lightningcss/node/index.mjs`
- `[ERROR] Could not resolve "../pkg"` (from `lightningcss/node/index.js:17`)

## Environment

- Node: v24.x
- pnpm: 10.x (corepack)
- OS: Linux/macOS (x64/arm64)

## Minimal fix we validated

Remove the runtime import of `vite` in `rwsdk`'s `normalizeModulePath.mjs` and inline a path normalizer:

```diff
- import { normalizePath as normalizePathSeparators } from 'vite'
+ const normalizePathSeparators = (p) => p.replace(/\\\\/g, '/')
```

This isolates Vite internals from the dep optimizer, preventing its CSS chunk from importing `lightningcss`.

## Notes

This repro includes a minimal wrangler.toml (main=src/worker.tsx) to satisfy rwsdk's plugin which reads wrangler config to locate the worker entry.
