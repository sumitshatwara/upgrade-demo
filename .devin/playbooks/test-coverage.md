# Weekly Test Coverage Playbook

**Schedule:** Every Monday at 06:00 UTC (automated via CI cron)
**Trigger:** Automated — no human action required
**Devin Knowledge Applied:** `test-standards.md`

---

## Playbook Steps

### Step 1 — Run Coverage Check

```bash
./.devin/skills/check-coverage.sh
```

This script runs Jest with `--coverage` across all 12 microservices and
outputs a Markdown coverage table to `coverage/summary.md`.

### Step 2 — Identify Below-Threshold Services

Parse `coverage/summary.md` for any service with coverage below **80%**
on the following compliance-critical paths:

- `auth/` (SSO, guards, interceptors)
- `transactions/` (list, model, filter)
- PII-handling paths (any file accessing `Transaction.amountCents`, `accountNumber`, `email`)
- `fraud-detection.service.ts`
- `banking-api.service.ts`

### Step 3 — Spin Up Parallel Devin Sessions

For **each** service below the 80% threshold:

1. Open a new parallel **Devin session** scoped to that service.
2. Provide context:
   - The coverage report section for that service.
   - Relevant source files.
   - `test-standards.md` knowledge document.
3. Instruct Devin to:
   - Write Jest unit tests for all uncovered branches.
   - Ensure edge case coverage: `null`, `''`, `[]`, malformed input.
   - Achieve ≥80% branch, function, line, and statement coverage.

### Step 4 — Open PRs

For each Devin session that produces tests:

1. Open a PR tagged with:
   - `coverage-improvement`
   - `automated`
   - `[service-name]`
   - The service owner (from `CODEOWNERS`).

2. PR title format: `test(coverage): improve [service-name] coverage to ≥80%`

3. PR must include the updated coverage report showing the improvement.

> **🛑 POLICY: Do NOT merge any auto-generated test PR without service owner review.**
> These PRs are opened for human review, not auto-merged.
> Service owner is responsible for verifying test correctness before merge.

---

## Coverage Thresholds Reference

| Service | Threshold | Owner |
|---|---|---|
| `sso-auth.service.ts` | 80% | `@platform-security` |
| `auth.guard.ts` | 80% | `@platform-security` |
| `banking-api.service.ts` | 80% | `@retail-banking-eng` |
| `fraud-detection.service.ts` | 80% | `@fraud-platform` |
| `transaction-list.component.ts` | 80% | `@retail-banking-eng` |
| `bfa-data-table.component.ts` | 60% | `@shared-ui` |
| `bfa-button.component.ts` | 60% | `@shared-ui` |
| `analytics.service.ts` | 60% | `@analytics-eng` |
