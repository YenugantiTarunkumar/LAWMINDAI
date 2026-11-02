# Controlled Vercel Preview Deployment

This project has not been deployed. Do not use these steps to change production settings, DNS, production data, or run migrations.

## Current preparation status

- The project builds with Next.js 16.4.4 using the default Node.js runtime and Turbopack.
- No `.vercel` project configuration or Git metadata is present in this workspace.
- The application has server route handlers and PDF/DOCX extraction; do not configure it as a static export or Edge-only application.
- Supabase connectivity is confirmed, but a signed-in user, live Gemini request, deployed RLS policies, and redirect settings have not been verified.

## Before connecting a repository

This workspace has no `.git` directory, so changed/untracked status, staging, history, and tracked-secret checks cannot be established here. Do not initialize Git or push until the owner approves. Before the first private-repository commit, use this file checklist:

- Include reviewed application source (`src/`), required static assets (`public/`), project configuration, `package.json`, `package-lock.json`, tests, `vitest.config.mts`, `README.md`, `LICENSE`, `AGENTS.md`, `.env.example`, and the readiness/deployment documents.
- Include `supabase/migrations/` only as reviewed SQL source; do not execute migrations as part of install/build or deployment.
- Exclude `.env.local` and all real environment files, credentials, private keys/key bundles, `node_modules/`, `.next/`, `.vercel/`, `reviews/` contents, `*.tsbuildinfo`, `next-env.d.ts`, local audit exports (`css-audit.txt`, `layout-audit.txt`, `page-source.txt`, `project-structure.txt`), and unused `src/app/*.backup.tsx` files.
- The current `.gitignore` excludes environment files except `.env.example`, saved-review data, build/dependency output, key material, and the listed local exports/backups. Ignore rules do not protect files that were already tracked or deliberately force-added; verify the staged file list and run an approved secret scanner before committing.
- Do not commit generated user documents, session files, logs, database exports, or browser profiles.

## Create a protected preview

1. In Vercel, import the reviewed repository and branch into a new or explicitly selected project.
2. Let Vercel detect Next.js. Use the repository root as the project root and the existing commands:
   - Install: `npm ci`
   - Build: `npm run build`
   - Output directory: leave the Next.js default; do not set a static output directory.
3. Configure environment variables for **Preview only**. Use a separate Supabase preview project and preview-only provider credentials. Keep Vercel Deployment Protection enabled while validating the preview. Preview access protection is not a substitute for API rate limiting.
4. Deploy a preview only after confirming the configured values are for that preview project. This document does not authorize deployment.

## Environment variables

| Name | Required for | Configuration |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Registration, login, and saved reviews | Public Supabase project URL. Set to the isolated preview project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Registration, login, and saved reviews | Supabase publishable/anon key. RLS must protect database access. |
| `GEMINI_API_KEY` | Live AI features | Server-only Vercel Preview environment variable. |

Do not configure `SUPABASE_SERVICE_ROLE_KEY`; the application does not require it. Never add AI credentials to `NEXT_PUBLIC_*` variables or client code. The AI model is centrally configured as `gemini-3.1-flash-lite`; users cannot select a model. Google's model and pricing documentation currently list the model as stable with free-tier input/output availability, subject to quota and eligibility. Without `GEMINI_API_KEY`, the synthetic contract-review demo remains explicitly available and generation requests report that AI is unavailable; unsupported Legal Assistant questions return a deterministic "no reliable indexed source" response.

The required environment variable names are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for authentication/review storage, and `GEMINI_API_KEY` for live AI. Set secrets in Vercel's Preview environment only, never in the repository.

## Supabase Auth and database

- In the isolated preview Supabase project's **Authentication → URL Configuration**, set **Site URL** to the exact stable protected Preview branch alias, for example `https://<preview-branch-alias>.vercel.app`. Add only the exact corresponding root URL (`https://<preview-branch-alias>.vercel.app/`) and the local test URL (`http://localhost:3000/`) to **Redirect URLs**. Do not add a wildcard or production domain. The signup handler does not pass a custom `emailRedirectTo`; Supabase's Site URL therefore controls the email-confirmation return destination. Login and signup navigate internally to `/reviews` and `/login`; there is no app-owned auth callback route. Confirm the confirmation link returns to the protected preview and the session is established there.
- The deployed database's schema and RLS state have not been verified. Saved reviews require the expected `reviews` table and user-ownership RLS policies.
- On the isolated preview project, verify that RLS is enabled on `public.reviews` and that SELECT, INSERT, UPDATE, and DELETE policies enforce `auth.uid() = user_id` (including INSERT `WITH CHECK`). Test with two non-production accounts: account A can create/read/update/delete its own disposable preview review; account B cannot see, read, update, or delete A's review and cannot insert a row as A; anonymous requests cannot read or write reviews. Confirm the app's review/chat APIs remain scoped to the signed-in owner. Remove only those disposable preview records after testing. Do not run these checks by creating or changing production records.
- SQL migrations are not run by the application or Vercel build. Have the database owner review the specific migration and obtain explicit approval before applying it to an isolated preview database. Do not run any migration against production.
- Do not use production user records or create/delete production records as part of preview testing.

## Runtime and upload checks

- Use the Node.js runtime; the project uses `pdf-parse` as a server external package and `mammoth` for DOCX extraction.
- The current client and extractor accept files up to 5 MiB; the review route bounds the full request to 6,000,000 bytes. Verify a near-limit upload in the protected Vercel preview before offering the limit to users.
- Scanned PDFs require OCR, which is not provided. DOCX extraction does not include page numbers.
- AI operations can take longer than ordinary page requests. Check Vercel function duration and logs during preview; set a route duration only if supported by the selected Vercel plan.

## AI endpoint abuse controls

The application currently has no application-level rate limiter; no limit is implemented or tested. Before exposing any endpoint beyond a protected Preview, apply controls to `POST /api/review`, `/api/chat`, `/api/legal-assistant`, `/api/case-guidance`, and `/api/legal-drafting`:

1. Use Vercel Firewall rate-limit rules for coarse edge protection by route and client IP if those rules are available on the selected plan. Keep Preview Deployment Protection enabled during testing.
2. Add a distributed application limiter backed by managed Redis (for example Upstash `@upstash/ratelimit`) for per-user quotas and IP quotas on anonymous requests. Use the trusted platform client-IP signal, not an arbitrary client-supplied forwarding header. Do not use in-memory counters in serverless functions.
3. Apply separate, conservative limits per route, combine with the existing request/file-size caps, return HTTP 429 with `Retry-After`, and fail closed for paid AI generation when the limiter store is unavailable. Test concurrent invocations, IPv4/IPv6 normalization, spoofed headers, provider errors, and limiter-store outages before public exposure.
4. Configure provider spending limits/alerts. Vercel Deployment Protection alone does not stop abuse by an authorized preview user.

No rate-limiter package, Redis instance, firewall rule, quota, or rate-limiter environment variable is configured by this project. If the owner selects the Upstash implementation, add its server-only credentials only after implementation and testing; do not set or invent them for this current preview.

## Preview acceptance checklist

- [ ] Confirm the reviewed staged file list contains only the approved private-repository checklist items; confirm no secrets or local user data are staged.
- [ ] Confirm Vercel project is linked to the intended private repository and preview branch.
- [ ] Confirm Deployment Protection is active.
- [ ] Confirm Preview variables are set by name and correspond only to preview services; never display or log their values.
- [ ] Confirm the exact Supabase Site URL/Redirect URLs and preview RLS policies with two non-production test accounts in the preview project.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.
- [ ] Verify login/logout, per-user review ownership, create/reopen review, and unauthorized access with non-production test accounts.
- [ ] Verify live AI configuration and failure handling. The API-free demo is not evidence of live AI connectivity.
- [ ] Test PDF, DOCX, TXT, and Markdown uploads, including a near-limit file and malformed-file errors.
- [ ] Configure and test edge and distributed application rate limits before any public exposure; these are not currently implemented.
- [ ] Check the protected preview at desktop and mobile widths and review Vercel function logs.
- [ ] Obtain explicit approval before changing production settings, running production migrations, or making the app public.
