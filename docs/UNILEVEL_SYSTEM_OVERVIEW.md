# AMANAH UNILEVEL MLM Management System

## System description

AMANAH UNILEVEL is a centralized, role-based management platform for operating a **single-leg Unilevel multi-level marketing (MLM) compensation structure**. It is intended to coordinate member enrollment, sponsor relationships, distributor activity, product and stock movements, branch operations, management oversight, and administrative controls in one auditable system.

The compensation model is Unilevel only. Each member is linked to one direct sponsor/upline for genealogy purposes. Members may sponsor multiple direct frontline members (width); eligible activity may be organized into successive levels (depth) according to the company's approved plan. This system is not designed around binary left/right legs, matrix placement, or forced matrix spillover.

**Commission plan:** the master development specification now defines a 10-level Unilevel plan and base rates. Qualification details, payout timing, returns treatment, and certain positional-commission behavior remain subject to configuration and approval before activation.

## Account roles and intended access

| Role | Main purpose | Intended workspace |
|---|---|---|
| Distributor | Build and manage their own Unilevel organization and track personal business activity. | Personal dashboard, profile, sponsor/upline, direct referrals and permitted downline view, orders, sales/volume summaries, commission statements, announcements. |
| Mobile Stockist | Manage company-authorized mobile stock assigned to them. | Assigned inventory, stock receipts, transfers, deliveries/handovers, low-stock alerts, replenishment requests and stock ledger. |
| Branch Operator | Handle daily transactions and records for an assigned branch. | Branch orders/sales, member assistance, stock receiving and issuing, transaction records, cash/payment reconciliation and branch reports. |
| Manager | Supervise assigned branch, territory or team operations. | Team and branch summaries, operational approvals, stock oversight, exception queues and management reports. |
| Admin | Configure and administer the platform within approved authority. | User accounts and role assignments, product and branch master data, configuration, audit logs, reporting and controlled system administration. |

A role selector on the login page is only a sign-in context. **It must never grant a role or elevate permissions.** The backend must authenticate the user, load the role assigned to that account, verify the requested role matches, and enforce permissions on every protected API and record. Admin accounts should be provisioned by an authorized administrator, not through public self-registration.

## Core system modules

1. **Identity and access** — secure sign-in, password recovery, account status, role assignment, session management, and audit logging.
2. **Distributor and member records** — unique member ID, contact/profile information, enrollment status, sponsor ID, join date, and account history.
3. **Unilevel genealogy** — one sponsor/upline relationship per member, direct frontline listing, level-based tree views, genealogy search, and change history. Sponsor changes require a controlled, auditable process.
4. **Orders and sales** — product catalog, order capture, payment status, fulfillment, cancellations, returns, and member purchase history.
5. **Inventory and stock movement** — branch and stockist stock balances, receiving, issuing, transfers, adjustments, returns, reorder requests, and movement history.
6. **Branch operations** — branch-level transactions, staff activity, daily closing and reconciliation, and branch reporting.
7. **Unilevel commission ledger** — configurable rule engine and traceable commission entries once the approved compensation plan is provided. Every calculation should retain its source transactions and rule version.
8. **Approvals and controls** — approval queues for sensitive actions such as stock adjustments, sponsor changes, refunds, manual credits, and payouts.
9. **Reports and dashboard** — role-filtered KPIs, member growth, sales, inventory, branch performance, genealogy summaries, commission liabilities and audit reports.
10. **System administration** — product and branch setup, user management, permissions, settings, announcements, and audit review.

## Access-control principles

- Apply least privilege: users can see and act only on records within their assigned role and organizational scope.
- A distributor can view their own profile and only the genealogy, order, and commission information authorized by policy.
- A mobile stockist is restricted to their assigned stock locations and approved stock operations.
- A branch operator is restricted to their assigned branch.
- A manager is restricted to their assigned branch, territory or team scope.
- Admin access is permission-based and auditable; sensitive actions should require confirmation and, where appropriate, a second approver.
- Enforce authorization on the server/database, not only by hiding buttons in the browser.
- Never store plaintext passwords, expose service-role keys in frontend code, or trust a role value submitted by the browser.

## Current implementation status

The website currently contains a **front-end role selection/sign-in interface** for the five roles above. It is a design and workflow foundation only. Live authentication, verified role provisioning, database-backed dashboards, Unilevel genealogy, inventory records, commission processing, and permission enforcement are not yet connected. Do not use this interface for real accounts or operational transactions until backend authentication and authorization have been implemented and tested.

## Business rules still required from AMANAH

Before enabling production calculations or transaction workflows, AMANAH must approve:

- Membership enrollment requirements, unique ID format, sponsor validation, and account activation/suspension rules.
- Qualification requirements, qualifying volume definitions, caps, payout timing, and returns/refunds treatment for the approved 10-level Unilevel plan.
- Treatment of personal purchases, retail sales, discounts, refunds, cancelled orders, chargebacks, and stockist purchases.
- Product price lists, stock ownership, transfer rules, branch/stockist territories, and inventory adjustment approvals.
- Which manager oversees each branch/territory and what records each role may view or edit.
- Approval thresholds, audit retention, privacy policy, and dispute/correction procedures.

These are policy inputs, not assumptions. The software should make them configurable with version history and effective dates after approval.


## Confirmed rules from the AMANAH master development specification

These values are sourced from the master specification and must be implemented server-side with versioned rules. They supersede the earlier statement that payable depth and base Unilevel rates were not yet defined.

### Unilevel genealogy and commission

- One direct sponsor per member; unlimited direct referrals (network width).
- Commission depth is exactly 10 levels.
- Levels 1–5: 12.5% of eligible product PV.
- Levels 6–10: 7.5% of eligible product PV.
- PV conversion: 1 PV = PHP 1.50.
- Formula: commission in pesos = product PV × level percentage × PHP 1.50.
- Example: 20 PV at 12.5% = PHP 3.75; 20 PV at 7.5% = PHP 2.25.
- Calculate from the purchased product's PV, never from retail/selling price.
- Do not pay an unqualified upline. Apply the approved qualification and no-skipping rules.
- Store transaction, buyer, sponsor/recipient, product, PV snapshot, network level, applied rate, peso amount, transaction date, qualification result, and payment status with each commission.
- Commission processing must be idempotent and atomic to prevent duplicate generation or payout.

### Product PV configuration

| Product | Product PV | Unilevel eligible | Rank qualification eligible |
|---|---:|---|---|
| Spirulina | 20 | Yes | Yes |
| Serpentina | 25 | Yes | Yes |
| Herbal Oil | 15 | Yes | Yes |
| Herbal Rub | 10 | Yes | Yes |
| Baskug Coffee | 30 | Yes | Yes |
| Barakah Coffee | 30 | Yes | Yes |
| Max C Pro | 40 | Yes | Yes |
| Glutagen Cee | 35 | Yes | Yes |
| Distributor Bundle | 50 | No | Yes |
| Mobile Stockist Bundle | 100 | No | Yes |

Keep `product_pv`, `unilevel_eligible`, and `rank_qualification_eligible` independent. Persist the product PV and rule version used by each historical transaction so later catalog edits do not rewrite past calculations.

### Promotional ranks

- Ranks: Regular Member, Junior Marketing Officer (JMO), Senior Marketing Officer (SMO).
- JMO additional positional commission: 1.3%.
- SMO additional positional commission: 1.3%.
- Keep positional commission processing separate from the Unilevel engine.
- Do not invent JMO/SMO qualification thresholds. Keep thresholds configurable and inactive until approved.
- For SMO, make cumulative versus replacement positional-commission behavior configurable; do not choose a default without approval.
- Preserve rank qualification and promotion history.

### Still requiring explicit business configuration

The master specification does not provide JMO/SMO qualification thresholds, the SMO cumulative/replacement decision, full qualification definitions for uplines, returns/refunds/chargeback treatment, payout schedule, caps (if any), and operational approval thresholds. Keep these inactive or configurable until approved. Do not activate live commission payouts merely because the base rates are known.
