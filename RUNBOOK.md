# RUNBOOK.md

## Quick start

### 1) Install

```bash
npm install
```

### 2) Create env file (no secrets in git)

Create `.env` locally based on `.env.example`:

```bash
cp .env.example .env
```

### 3) Run dev

```bash
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Quality gates (must pass before merge/deploy)

### Typecheck

```bash
npx tsc --noEmit
```

### Production build

```bash
npm run build
```

## Environment variables

### `.env.example` (template)

Create/keep this file in repo. Put only variable names and safe placeholders.

Recommended minimum (matches current `api/ai.ts`):

```env
# Server-side AI proxy (api/ai.ts)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional future override
# GEMINI_MODEL=gemini-2.0-flash
```

Rules:
- `.env` must be in `.gitignore`
- Keys must be used only by server code (e.g. `api/ai.ts`), not by Vite client.

## Common issues & fixes

### A) `Expected 1 arguments, but got 2` for `aiText(...)`

Cause: `aiText` defined with one argument but called with `(prompt, options)`.

Fix: Update `src/core/ai/aiGateway.ts`:
- `aiText(prompt: string, options?: ...)`
- export `aiImage(...)` if used by `documentAi.ts`

### B) `aiImage is not exported by aiGateway.ts`

Cause: `documentAi.ts` imports `aiImage` but `aiGateway.ts` does not export it.

Fix: Export `aiImage` from `aiGateway.ts` and ensure it calls `/api/ai` in `mode: "image"`.

### C) Vite build warning: `/index.css` doesn't exist at build time

Cause: `index.html` links to `/index.css` but the file does not exist in `public/`.

Fix (recommended):
- Remove `<link rel="stylesheet" href="/index.css">` from `index.html`
- Import CSS in `src/main.tsx`: `import "./index.css"`

### D) Alias `@/...` not resolving

Fix:
- `vite.config.ts`: alias `@` -> `<root>/src`
- `tsconfig.json`: `"baseUrl": ".", "paths": { "@/*": ["src/*"] }`

### E) `/api/ai` works in dev but fails in prod

Likely causes:
- serverless function not deployed / route mismatch
- env vars missing in deployment
- wrong payload fields

Fix:
- Ensure deployment includes `api/ai.ts` (Vercel/Netlify config as needed)
- Ensure env vars exist in hosting provider
- Confirm payload matches `API_CONTRACT.md`

## Release checklist

- `git status` clean
- `npx tsc --noEmit` passes
- `npm run build` passes
- `.env` not committed
- `API_CONTRACT.md` reflects actual `/api/ai` implementation
- Smoke tests passed:
  - Parent → Matching
  - Nanny → Profile
  - Document upload → Verification
- Production AI checks:
  - `/api/ai` curl returns expected shape
  - quota/key verified
  - backup key available
- Rollback readiness:
  - previous stable commit/tag noted
  - rollback command prepared (`git revert` or redeploy previous production)
