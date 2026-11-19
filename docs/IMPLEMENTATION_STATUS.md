# AMANAH implementation status and technical audit

**Audit basis:** repository source inspected on 2026-11-19 and the AMANAH System – Master Development and Implementation Prompt supplied by the project owner.

## Executive assessment

The repository is an existing React 18 + TypeScript + Vite + Tailwind website deployed through GitHub Pages. It is not yet a functioning MLM management platform. The current application is primarily a public-facing landing page with product content, a client-side POS/cart interface, contact form, and a sign-in/enrollment UI foundation.

The master specification now defines the 10-level Unilevel base commission plan and product PV rules. Those rules are documented, but **no commission engine, member database, authenticated dashboards, withdrawal ledger, or production authorization layer has been implemented**.

No production database records or credentials were changed during this audit.

## 1. Files inspected

- `package.json` — React/Vite/Tailwind dependencies and build scripts.
- `src/App.tsx` — current landing page, product catalog, POS/cart, contact form, role sign-in UI, and event handlers.
- `src/main.tsx` — React application entry point.
- `src/index.css` — Tailwind and global styles.
- `vite.config.ts` — Vite build configuration and GitHub Pages base path.
- `index.html` — HTML application entry.
- `.github/workflows/deploy.yml` — GitHub Pages build/deploy workflow.
- `docs/UNILEVEL_SYSTEM_OVERVIEW.md` — role and system overview; updated on the feature branch to reflect the master specification.

The repository's inspected package manifest does not include `@supabase/supabase-js`. No `supabase/config.toml`, `.env.example`, or database migration file was found at the expected paths. The frontend contains Supabase Storage asset URLs, but that is not evidence of an authenticated database connection.

## 2. Architecture and findings

| Area | Finding |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Deployment | GitHub Actions workflow builds `dist` and deploys to GitHub Pages |
| Supabase | Public Storage URLs appear in frontend content; no Supabase client SDK or inspected schema/migrations |
| Authentication | Role selector and login/enrollment interface only; handler explicitly reports that authentication is not connected |
| Authorization | No server/database role enforcement or RLS policy found in inspected source |
| Member dashboard | No authenticated, database-backed dashboard found |
| Genealogy | No sponsor graph or 10-level genealogy engine found |
| Commission/PV | No product PV fields, commission rules engine, immutable commission ledger, or idempotent processing found |
| Product catalog | Existing public product content is hardcoded and does not yet match the complete master-spec catalog/PV configuration |
| POS | Checkout creates a random reference and displays a local React receipt; it does not persist an order or verify payment |
| Contact form | Submission displays a delayed local success state; it does not persist an inquiry |
| Withdrawals | No withdrawal request, reservation, approval, payment verification, or ledger workflow found |
| AI support | No AI service or conversation persistence found |

The local POS receipt and contact-form success state must not be treated as evidence that an order or inquiry has been saved. These are frontend-only interactions.

## 3. Master-spec rules captured

- One direct sponsor per member; unlimited network width; commission depth 10.
- Levels 1–5: 12.5%; Levels 6–10: 7.5%.
- Commission pesos = product PV × level rate × PHP 1.50.
- Product PV values and independent Unilevel/rank eligibility flags are listed in the system overview.
- Distributor Bundle (50 PV) and Mobile Stockist Bundle (100 PV) are rank-qualification eligible but Unilevel-ineligible.
- JMO and SMO each have a specified 1.3% positional commission, separate from Unilevel.
- JMO/SMO thresholds remain inactive until approved; SMO cumulative-versus-replacement behavior remains configurable and unselected.
- Historical transactions must retain the PV/rule snapshot used at processing time.

## 4. Files created or modified in this audit session

- Modified `docs/UNILEVEL_SYSTEM_OVERVIEW.md` on `feature/unilevel-multi-role-access` to reconcile the overview with the master specification and document the confirmed PV, Unilevel, and rank rules.
- Created `docs/IMPLEMENTATION_STATUS.md` (this report).

No production data, Supabase schema, credentials, or live financial records were modified.

## 5. Phase-by-phase implementation plan

1. **Phase 1 — Audit and preservation:** audit performed from repository files available to the GitHub integration. A live Supabase schema audit remains blocked until secure project access is connected.
2. **Phase 2 — Database design/migration preparation:** inspect actual existing Supabase tables and policies first; then prepare additive, backward-compatible migrations for profiles/roles, sponsor relationships, closure/path data, product PV snapshots, orders, commission rules/entries, ranks, withdrawals, financial ledger, inquiries/conversations, notifications, and audit logs. Do not apply migrations before schema review.
3. **Phase 3 — Genealogy:** implement one-sponsor validation, cycle prevention, unlimited width, and correct 1–10 ancestor traversal.
4. **Phase 4 — PV and Unilevel commissions:** implement server-side rule-versioned calculation, product eligibility checks, qualification/no-skipping, idempotency, and immutable commission records.
5. **Phase 5 — JMO/SMO:** implement rank history and qualification engine, keeping thresholds inactive until approved; keep positional commissions separate.
6. **Phase 6 — Dashboards:** build role-filtered member and operations dashboards backed by real database queries.
7. **Phase 7 — Withdrawals/ledger:** reserve pending amounts, validate available balance atomically, require admin approval, and record verified payments only.
8. **Phase 8 — Directory/admin:** implement scoped member search, branch/stockist operations, management tools, and audit reporting.
9. **Phase 9 — AI support:** persist consented inquiries and conversations; restrict responses to approved company/product content.
10. **Phase 10 — Security/testing/deployment:** test RLS and server-side authorization, financial invariants, genealogy, idempotency, privacy, and deployment readiness.

## 6. Required access and unresolved policy inputs

The repository inspection did not expose a Supabase management connection or database schema. To proceed safely, connect the existing Supabase project through an authorized integration or provide a schema-only export (tables, columns, foreign keys, indexes, RLS policies, and function definitions). Do not send service-role keys, database passwords, or other secrets in chat.

Still to be configured before activating the relevant workflows:
- Upline qualification definitions and no-skipping conditions.
- JMO and SMO qualification thresholds.
- Whether SMO positional commission is cumulative or replaces the JMO positional rate.
- Refund, return, cancellation, chargeback, and stockist-purchase commission treatment.
- Payout schedule, caps if any, and operational approval thresholds.
- Branch/territory assignments and exact record scopes for each role.

## 7. Progress estimate

Percentages below measure implemented and tested platform functionality, not documentation or code volume. No automated build or integration test result is claimed in this audit.

| Module | Status | Completion |
|---|---|---:|
| Member dashboard | Pending | 0% |
| Unilevel engine | Pending | 0% |
| PV system | Specification documented; engine pending | 0% |
| JMO/SMO | Rules documented; engine pending | 0% |
| Withdrawal | Pending | 0% |
| Member directory | Pending | 0% |
| AI automation | Pending | 0% |
| Security | UI warning only; backend controls pending | 0% |

**Estimated full-platform implementation: 3%.** The existing public website and build foundation are retained, but they do not constitute the requested production MLM system.

## 8. Exact next development step

Obtain read-only access to the existing Supabase schema and RLS policies, complete the database inventory, and design additive migrations against the actual schema. Only after that review should the first database migration be prepared. No migration should be applied to production without explicit authorization.
