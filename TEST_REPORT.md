# Test Report

Updated: 2026-11-02

## Automated checks

| Check | Status | Result |
|---|---|---|
| `npm ci` | BLOCKED | Windows returned `EPERM` while unlinking a locked native dependency binary. `npm install` restored dependencies successfully, and lint, TypeScript, tests, build, and the production audit then passed. |
| `npm run lint` | PASS | ESLint completed with no errors or warnings after navigation fixes. |
| `npx tsc --noEmit` | PASS | TypeScript completed with no diagnostics. |
| `npm test` | PASS | Vitest: 5 test files, 32 tests passed, including Full Review consistency and evidence regressions. |
| `npm run build` | PASS | Next.js 16.4.4 production build and route generation completed. |
| `npm audit --omit=dev` | PASS | 0 production dependency advisories. |
| `npm audit` | PARTIAL | 16 moderate development/lint-tooling advisories remain; no high or critical advisories. |

### Automated coverage added

- API validation for review, chat, Legal Assistant, Case Guidance, drafting, and invalid signup input.
- UTF-8 TXT/Markdown extraction, unsupported/empty/oversized files, malformed PDF signature, and invalid UTF-8.
- Review risk aggregation and rejection of unsupported legal authorities.
- Document-chat evidence quotation validation and page-number preservation.
- Mocked saved-review ownership filtering and invalid ID rejection.
- Indian-law candidate source status, required drafting fields, and provider-not-configured behavior.

## Local production and browser checks

| Check | Status | Result |
|---|---|---|
| Production route smoke test | PASS | Home, review, saved reviews, Legal Assistant, Case Guidance, drafting, login, and signup returned HTTP 200. |
| Mobile layout | PASS | At a 390 px configured viewport (375 px content viewport), the same eight pages had no horizontal overflow. |
| Desktop layout | PASS | Home page at a 1440 px configured viewport had no horizontal overflow. |
| Dashboard navigation | PASS | Quick-action cards link to Legal Assistant, Case Guidance, and Legal Document Drafting. |
| API-free contract demo | PASS | Browser flow completed with the synthetic-data disclaimer and without a provider key. |
| API validation/error probes | PASS | Invalid requests returned HTTP 400; anonymous saved-review access returned 401; missing AI configuration returned HTTP 503. |
| Supabase connectivity | PASS | Auth health and zero-row `reviews` REST probes returned HTTP 200; no records were read or changed. |

## Functional limits and blocked checks

| Module / check | Status | Limitation |
|---|---|---|
| Authentication | PARTIAL | Supabase is reachable and there is no active session. No signup, confirmation, login, or logout was attempted against a real account. |
| Saved reviews and ownership | PARTIAL | Anonymous API access is rejected and source queries scope by user ID. Creating/reopening a review and cross-user isolation need two non-production accounts; no records were created. |
| Contract analysis | PARTIAL | A synthetic live Full Review request returned HTTP 502 without a structured result. The request did not save data. The client response does not identify the provider-side cause, so live Full Review is not verified. Valid PDF/DOCX extraction and live review behavior remain incomplete checks. |
| Document chatbot | PARTIAL | Evidence parsing and input validation are tested. Live answers against an owned saved review were not tested; an authenticated review is still required. |
| Indian Legal Assistant | PARTIAL | Request validation and unverified-source labeling are tested. Live generation and current-source verification are unverified; candidate references are not approved authorities. |
| Case Guidance | PARTIAL | Request validation and structured UI are checked. Live generation, generated-report validation, and external legal-source verification remain unverified. |
| Legal Drafting | PARTIAL | Templates/UI and request validation are present. Live generation, editing of generated clauses, and export of a generated draft remain untested. Drafts are browser-session-only. |
| Vercel preview | BLOCKED | No `.vercel` project or Git repository is present. No deployment or production configuration change was made. |

The successful demo and mocked/unit checks are not evidence of live AI functionality. One synthetic live Full Review request was attempted and returned HTTP 502; no database write, migration, production-record mutation, or public deployment occurred.

## Gemini-only AI integration — 2026-11-02

| Check | Status | Result |
|---|---|---|
| Provider integration | PASS (source review) | AI routes use the centralized Google Gemini adapter and the fixed `gemini-3.1-flash-lite` model. OpenAI and Anthropic adapters/dependencies were removed. |
| Gemini credential and live request | PARTIAL | `GEMINI_API_KEY` is populated locally (value not displayed). A synthetic Full Review request returned HTTP 502 rather than a valid review; live AI functionality is not verified. |
| Provider UI | PASS (source review) | Provider selection controls and client-supplied provider options were removed. No AI provider name is shown in active application UI; errors use generic AI-service language. |
| Free tier | PASS (documentation review) | Google's current model/pricing documentation lists `gemini-3.1-flash-lite` as stable and shows free-tier input and output availability. Availability, quotas, and eligibility can change. |
| TypeScript and production build | PASS | The Google adapter and AI SDK core are compatible (`@ai-sdk/google` 3.0.140 with AI SDK 6.0.320); `npx tsc --noEmit` and `npm run build` both pass. |
| Full post-integration validation | PASS | `npm run lint`, `npx tsc --noEmit`, `npm test` (5 files / 32 tests), and `npm run build` pass. The prior production dependency audit reported 0 advisories; the full audit still reports 16 moderate development-tooling advisories. |

## Final pre-deployment preparation review — 2026-11-02

| Check | Status | Result |
|---|---|---|
| Workspace/Git state | BLOCKED | No `.git` directory exists. Changed/untracked/staged files, commit history, and tracked-secret status cannot be verified. No Git repository was initialized. |
| Secret exposure scan | PASS | Scanned project files without displaying matched text or environment values. No high-confidence API-key, JWT, or private-key patterns were found outside `.env.local`, dependency/build output, and synthetic sample reviews. No private-key/credential-named files were found. |
| Environment files | PASS | `.env.local` exists and `.gitignore` excludes `.env*` while allowing `.env.example`. Only environment variable names were examined. The template uses placeholders; the unused service-role example was removed. |
| Generated/local data | PASS | The local `reviews/` directory contains synthetic sample documents and is ignored. Common private key bundles, audit/source dumps, and app backup pages are now excluded by `.gitignore`. |
| AI unavailable behavior | PASS | Automated tests verify all five AI routes return generic HTTP 503 errors when `GEMINI_API_KEY` is absent. A later synthetic live Full Review request returned HTTP 502; no successful live AI result is verified. Synthetic output is limited to the explicit API-free review demo; Legal Assistant's deterministic out-of-scope response identifies that no reliable indexed source was found. |
| Rate limiting | BLOCKED | No rate limiter or Vercel Firewall rule exists or was tested. A Vercel Firewall plus distributed Redis-backed per-IP/per-user limiter is documented as a pre-public-exposure action. |
| Supabase redirects/RLS | BLOCKED | Exact isolated-preview URL and two-account ownership checks are documented, but no Preview project or test accounts are configured. No records or policies were changed. |

Repository file checklist and exact preview variables are in `DEPLOYMENT.md`. The local secret scan does not prove a Git history is clean; verify the staged file list and approved secret-scanner results once the owner creates/approves a private repository.

## Full Review evidence and consistency improvements

| Check | Status | Result |
|---|---|---|
| Canonical findings and risk distribution | PASS | Unique evidence-backed clauses drive risk counts; duplicate quoted findings are collapsed, and missing/ambiguous provisions remain separate categories. Unsupported findings are excluded from confirmed risk counts. |
| Evidence and recommendation safeguards | PASS (automated) | Exact quote matching, unsupported-value/forum screening, and citation allowlisting are covered by regression tests. These heuristics do not guarantee semantic detection of every unsupported statement. |
| Drafting-quality score | PASS (automated) | Seven explicit dimensions are required; the server recomputes the rounded equal-weight mean and labels it a heuristic, not a legal-validity score. |
| Legal-reference presentation | PASS (source review) | Allowlisted references are presented as unverified general references, without implying current-law verification. |
| Final validation after quality changes | PASS | `npm run lint`, `npx tsc --noEmit`, `npm test` (5 files / 32 tests), and `npm run build` all pass. |
| Live Gemini Full Review | BLOCKED | One synthetic request returned HTTP 502. The response was not a successful live review; inspect the local server/provider logs and retry before relying on live AI behavior. |
