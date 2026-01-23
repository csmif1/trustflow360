# TrustFlow360 Codebase Audit

Audit this codebase against the PVD V1 scope. Produce a structured gap analysis.

## V1 Requirements (8 Phases)

1. Premium Alert (Full) — Surface upcoming premiums 90 days out; flag if underfunded
2. Gift Coordination (Full) — Generate contribution requests; track receipt
3. Crummey Compliance (Full) — Auto-generate notices; track delivery; start 30-day withdrawal clock
4. Withdrawal Lapse (Full) — Log lapse after 30 days; unlock funds for payment
5. Premium Payment (Basic) — Tracking only; log transactions
6. Policy Health Check (AI-Powered) — AI analyzes policy performance; flags remediation needs
7. Remediation Workflow (Light) — Surface problems + options
8. Reporting (Basic) — Exportable audit trail; gift tax summary

## Audit Tasks

### 1. Edge Functions Inventory
For each function in supabase/functions/:
- What does it actually do? (read the code)
- What inputs does it expect?
- What outputs does it return?
- Which PVD phase does it serve?
- Is it complete/functional or stub/partial?

### 2. Frontend Flow Inventory
Scan src/ for:
- Existing pages/routes — what user flows exist?
- Components that map to PVD phases
- Forms and data entry points
- Dashboard/reporting views
- Any dead code or unused components

### 3. Database Schema Review
Check for Supabase schema definitions or migrations:
- What tables exist?
- Do they support all 8 PVD phases?
- What's missing?

### 4. Output Format
Produce markdown report with each phase showing:
- Required (from PVD)
- Exists (what's in code)
- Gap (what's missing)
- Effort (S/M/L)

End with recommended build order.
