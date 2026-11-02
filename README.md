# LawMind AI

LawMind AI is a legal-intelligence workspace for AI-assisted contract review, document-grounded questions, general Indian-law information, case guidance, and editable legal-document drafts. It is an informational tool, not a substitute for advice from a qualified Indian advocate.

## Current functionality

- **Overview:** shows saved-review statistics only for a signed-in user; it does not invent sample statistics.
- **Contract Review:** accepts pasted text and PDF, DOCX, TXT, or Markdown uploads. A clearly labeled, synthetic, API-free demo is available without credentials. Live analysis requires server-side AI configuration.
- **Saved Reviews:** authenticated Supabase review history, subject to the reviews table and its Row Level Security policies being available in the selected database.
- **Document Chat:** answers questions from retrieved contract passages and validates supporting quotations. Page numbers are included when the uploaded PDF provides them.
- **Legal Assistant and Case Guidance:** implemented AI workflows with structured responses. Legal references are candidate discovery links and are marked unverified; they must not be treated as approved legal authorities.
- **Legal Document Drafting:** structured templates, editable generated clauses, and plain-text export. Drafts remain in the browser session and are not saved to Supabase.
- **Knowledge Library:** not implemented and marked as coming soon.

Conversations and draft work are not persisted to an account. Avoid sending information you do not want processed by the AI service. Generated analysis and drafts need review by a qualified professional.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Vercel AI SDK with Google Gemini
- `pdf-parse` and `mammoth` for PDF and DOCX text extraction

## Requirements

- Node.js 20.9 or later
- npm
- Supabase project for accounts and saved reviews
- A Google Gemini API key for live AI features

## Local setup

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Set the required values in `.env.local` without replacing existing Supabase settings (see [Environment variables](#environment-variables)), then run:

```powershell
npm run dev
```

Open <http://localhost:3000>. The API-free synthetic contract-review demo works without Supabase or AI credentials.

## Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; required for auth and private saved reviews. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key; required with the URL. Keep database access protected by RLS. |
| `GEMINI_API_KEY` | Server-only Gemini credential for live AI features. |

The model is centrally configured as `gemini-3.1-flash-lite`; there is no user or environment model selection. Google's current model and pricing documentation lists it as stable and shows free-tier input/output availability; quota and eligibility may change. Never put AI credentials or a Supabase service-role key in browser code or `NEXT_PUBLIC_*` variables. The application does not need a service-role key. `.env.local` is ignored by `.gitignore`; do not commit it.

## Supabase setup

The application expects a `reviews` table protected by Row Level Security and ownership policies. SQL migrations are in `supabase/migrations/`. They are not run automatically. Review the intended migration and target project before applying anything; do not apply migrations to production as part of deployment preparation.

Configure Supabase Auth redirect URLs for localhost and the exact Vercel preview URL before testing signup or confirmation flows. Use a separate preview Supabase project rather than production data.

## File uploads

The client and extraction utility cap individual documents at **5 MiB**; the review API caps the request body at **6,000,000 bytes**. TXT and Markdown must be UTF-8. Scanned PDFs require OCR before analysis; OCR is not provided. PDF page references are available when extraction can identify page boundaries. DOCX extraction does not provide pagination.

## Commands

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
npm start
```

## Hosting and reports

- [Vercel preview setup](./DEPLOYMENT.md)
- [Automated and manual test results](./TEST_REPORT.md)
- [Security review and residual risks](./SECURITY_NOTES.md)
- [Current readiness progress](./PROJECT_PROGRESS.md)

Do not configure production settings, run production migrations, or deploy publicly without explicit approval.

## License and attribution

See [LICENSE](./LICENSE). This workspace retains the existing terms-ai project attribution to [Ngandu Kasuku](https://www.linkedin.com/in/ngandukasuku/).
