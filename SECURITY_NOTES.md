# Security Notes

## Review result

**Status: PASS —** a read-only source security review reported no vulnerabilities meeting its reporting threshold. It covered authentication and review ownership/RLS, request validation and document extraction, untrusted AI inputs, server/client secret boundaries, and public endpoints. No service credentials were printed, no database writes were made, and no migrations were run.

## Verified controls and limits

- Saved-review handlers scope queries to the authenticated user; the anonymous saved-review API probe returned HTTP 401.
- Supabase Auth health and a zero-row REST probe returned HTTP 200. This does not establish that deployed RLS policies or preview/production Auth settings are correct.
- The Gemini credential is server-only. `.env.local` is excluded by `.gitignore`; `.env.example` contains a placeholder. This workspace has no Git metadata, so committed-secret and branch checks could not be performed.
- Review, chat, case guidance, and legal drafting endpoints validate request bodies and impose size limits. Document extraction rejects invalid formats and malformed text/PDF/DOCX input.
- Prompt instructions treat user-provided documents and conversation content as untrusted. The chat response parser accepts only evidence quotations found in retrieved passages.
- Indian-law references are labeled unverified candidates; no candidate source should be represented as an approved or current legal authority.
- Dependency audit after compatible updates: **0 production advisories** and **0 high/critical advisories overall**. The full audit still reports 16 moderate advisories in development/lint tooling, in the ESLint/minimatch dependency chain. `npm audit fix` did not resolve these without a breaking ESLint downgrade; no force fix was applied.

## Residual risks before public exposure

| Status | Risk | Required action |
|---|---|---|
| PARTIAL | Public AI endpoints have no application-level rate limiting. If provider keys are configured, unauthenticated traffic may consume provider quota or incur costs. | Keep Preview Deployment Protection enabled. Before public access, use Vercel Firewall per-route/IP limits where available and a distributed Redis-backed app limiter (for example Upstash) keyed by trusted client IP and authenticated user where present. Use separate conservative route quotas, 429/`Retry-After`, fail closed if the limiter store is unavailable, and provider spending limits/alerts. This is a proposal only; no limiter or rule is implemented or tested. |
| BLOCKED | No signed-in test user was available. Cross-user access, signup confirmation, login/logout, and deployed RLS behavior were not exercised against the live project. | Validate with two non-production test accounts and an isolated preview database after the owner confirms the correct schema/policies. |
| BLOCKED | `GEMINI_API_KEY` is blank locally; no live generation was tested. | Add a Preview-only key in Vercel and verify output validation, cost controls, and AI-service failure handling. |
| BLOCKED | No Vercel project, repository link, or deployed environment was available. | Keep preview deployment protected; verify redirect allowlists and hosting settings before any deploy. |
| PARTIAL | The full dependency audit retains 16 moderate advisories in development tooling. | Reassess after compatible ESLint/minimatch releases; do not use a breaking or forced dependency downgrade as a shortcut. |

## Database and secret handling

- No service-role key is needed by this application. Never place one in browser code or a `NEXT_PUBLIC_*` variable.
- Do not run `supabase/migrations/` automatically. The live database's schema and RLS state have not been verified; obtain explicit approval before any migration, and use an isolated preview database.
- Do not include `.env.local` in Git or Vercel build artifacts. Configure secrets through the Vercel environment-variable UI, scoped to Preview until explicitly approved otherwise.
- No public deployment, DNS change, live migration, or production data mutation was performed.

## Final pre-deployment file and behavior review

- The workspace has no Git metadata. It is not possible to determine which existing files are changed, untracked, staged, or present in history. Do not treat this filesystem scan as proof of a clean Git index or commit history.
- `.env.local` is present and excluded by `.gitignore`; only its variable names were inspected. No high-confidence API-token, JWT, or private-key patterns were found in project files outside `.env.local`, dependencies/build output, and the synthetic sample-review folder. No private-key or credential-named files were found. `.env.example` uses placeholders and contains no credential-pattern match; its unused service-role example was removed.
- `.gitignore` now excludes common private key/bundle extensions and names, local saved reviews, build/dependency output, audit exports, and unused backup pages. Ignore rules cannot protect an already tracked or force-added file; review the staged list and use a secret scanner when an approved private repository exists.
- The local `reviews/` directory contains only synthetic sample agreements; all contents are ignored. Root audit/source/structure dumps and app backup pages are excluded from a first repository commit.
- Generation requests on all five AI POST routes previously returned HTTP 503 with explicit configuration messages in local production-build smoke tests. Those tests predate the Gemini-only refactor; retest is required. The Legal Assistant may return a deterministic out-of-scope response when its index has no reliable source, which clearly says so. Only the contract-review demo is synthetic, and it is an explicit user-selected mode with an explicit demo label. UI request handlers display errors instead of substituting mock AI output.
- Supabase Auth signup has no custom email redirect. For Preview, set the isolated project's Site URL to the exact stable protected Preview alias and allow only that exact root and `http://localhost:3000/`; verify the email-confirmation return and session. Verify RLS with two non-production accounts against isolated Preview only.
