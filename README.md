# bofa-digital-banking

> **Sample Bank of America Digital Banking Platform*
> Angular 14 monorepo used to demonstrate an AI-governed Angular 14 → 18 compliance-EOL upgrade using [Devin](https://app.devin.ai).

---

## What This Repo Is

This is a **realistic but non-production** Angular 14 monorepo that simulates the Bank of America digital banking platform. The repo contains intentional Angular 14 legacy patterns (NgModules, deprecated guards, RxJS 6 syntax, Karma/Jasmine) that serve as migration targets for the testing.

---

## Pull Request Workflow

Use `.github/PULL_REQUEST_TEMPLATE/devin_pr_template.md` for every change so the summary, testing notes, and standards checklist stay consistent.

---

## Repository Structure

```
bofa-digital-banking/
├── apps/
│   ├── retail-banking-portal/       # Primary consumer app (Angular 14)
│   ├── corporate-dashboard/         # Corporate banking UI (Angular 14)
│   └── mobile-api-gateway/          # Mobile backend gateway UI (Angular 14)
├── libs/
│   ├── shared-ui/                   # Shared Angular Material component library
│   └── shared-data-access/          # Shared HTTP services and domain models
└── .devin/
    ├── knowledge/                   # BofA internal standards loaded into Devin Knowledge
    ├── playbooks/                   # Governed migration and coverage playbooks
    └── skills/                      # Executable validation scripts
```

---

## Apps

### `apps/retail-banking-portal`

The flagship retail customer-facing Angular app. Contains the highest concentration of Angular 14 legacy patterns because it owns the SSO authentication flow, routing, and transaction display.

**Key files:**

| File | Purpose |
|---|---|
| `package.json` | Angular 14.x + RxJS 6.x dependencies |
| `angular.json` | Angular CLI workspace config |
| `tsconfig.json` | TypeScript config with `strict: false` (migration target) |
| `karma.conf.js` | Karma/Jasmine test runner (deprecated — migration target for Jest) |
| `src/app/app.module.ts` | Root NgModule with `HttpClientModule` and class declarations |
| `src/app/app-routing.module.ts` | `RouterModule.forRoot()` with legacy `relativeLinkResolution` option |
| `src/app/auth/sso-auth.service.ts` | SAML/SSO authentication service — mock BofA identity provider flow |
| `src/app/auth/auth.guard.ts` | Class-based `CanActivate` guard (deprecated Angular 15+) |
| `src/app/dashboard/dashboard.component.ts` | OnPush component with `combineLatest([])` array syntax and `@ViewChild({ static: true })` |
| `src/app/dashboard/dashboard.component.html` | Template using `*ngIf` / `*ngFor` structural directives |
| `src/app/transactions/transaction-list.component.ts` | Paginated table consuming `BfaDataTableComponent` from shared-ui |
| `src/app/transactions/transaction.model.ts` | Transaction domain models and PII-adjacent type definitions |
| `src/app/analytics/analytics.service.ts` | Wrapper around a proprietary SDK loaded as a window global |

**Angular 14 patterns intentionally present (all are migration targets):**

- `@NgModule` declarations — components not standalone
- `HttpClientModule` import — replace with `provideHttpClient()`
- `RouterModule.forRoot()` with legacy options — replace with `provideRouter()`
- `CanActivate` interface on `auth.guard.ts` — replace with functional guard
- `@ViewChild('...', { static: true })` — remove static flag
- `combineLatest([obs1, obs2])` RxJS 6 array syntax — replace with object syntax
- `karma.conf.js` — replace with Jest
- `tsconfig.json` `strict: false` — incremental strictness migration

---

### `apps/corporate-dashboard`

Corporate banking UI for wire transfers and treasury management. Consumes `@bofa/shared-ui` and `@bofa/shared-data-access` via NgModule imports.

**Key files:**

| File | Purpose |
|---|---|
| `package.json` | Angular 14.x, depends on `@bofa/shared-ui` and `@bofa/shared-data-access` |
| `src/app/app.module.ts` | Root NgModule with `HttpClientModule`, `SharedUiModule`, and `RouterModule.forRoot()` |

---

### `apps/mobile-api-gateway`

Angular shell for the mobile banking API gateway management UI. Minimal UI surface — notification and status components only.

**Key files:**

| File | Purpose |
|---|---|
| `package.json` | Angular 14.x, serves on port 4300 |
| `src/app/app.module.ts` | Root NgModule pattern, consumes `SharedUiModule` |

---

## Libraries

### `libs/shared-ui`

Shared Angular Material v14 component library consumed by all three apps. This is the **highest-risk migration surface** — any breaking change here propagates to all 8 downstream consumers and must be resolved before app-level migration begins.

**Key files:**

| File | Purpose |
|---|---|
| `package.json` | Peer deps against Angular 14 + Material 14 |
| `src/lib/button/bfa-button.component.ts` | BofA-styled button wrapping `MatButton` — uses `color="primary"` ThemePalette (removed in Material v18) |
| `src/lib/data-table/bfa-data-table.component.ts` | Mat-table with `[matSortActive]` and `[matSortDirection]` input bindings — **these inputs were removed in Angular Material v18** |
| `src/lib/notification-banner/bfa-notification.component.ts` | Alert/notification banner with `HostBinding` |
| `src/lib/index.ts` | Barrel export — exports all components and `SharedUiModule` |
| `src/lib/shared-ui.module.ts` | NgModule wrapper consumed by all three apps |

**Angular Material v14 patterns present (migration targets for Phase 5):**

- `[matSortActive]="initialSortColumn"` on `<mat-table>` → initialize via `this.sort.active` in `ngAfterViewInit`
- `[matSortDirection]="initialSortDirection"` on `<mat-table>` → initialize via `this.sort.direction`
- `color="primary"` on `MatButton` → CSS custom properties in Material v18 (MD3)
- `appearance="legacy"` on form fields → replace with `appearance="outline"`
- `SharedUiModule` NgModule aggregation → individual standalone component imports

---

### `libs/shared-data-access`

Shared HTTP services and domain models used by all three apps. Contains RxJS 6 deprecated patterns that are migration targets for Phase 4.

**Key files:**

| File | Purpose |
|---|---|
| `src/lib/api/banking-api.service.ts` | Central HTTP client for account and transaction data. Contains `observable.toPromise()` (RxJS 6, deprecated) |
| `src/lib/api/fraud-detection.service.ts` | Real-time fraud risk assessment service. Contains `combineLatest([signals$, profile$])` array syntax (RxJS 6) |

**RxJS 6 patterns present (migration targets for Phase 4):**

| File | Line | Pattern | Replacement |
|---|---:|---|---|
| `banking-api.service.ts` | 79 | `observable.toPromise()` | `lastValueFrom(observable)` |
| `fraud-detection.service.ts` | 67 | `combineLatest([obs1, obs2])` | `combineLatest({ signals: obs1, profile: obs2 })` |
| `dashboard.component.ts` | 90 | `combineLatest([...])` | Object syntax |

---

## `.devin/` — Governance Layer

This directory is what makes the repo a Devin demo environment. It contains the three types of Devin-specific assets that govern how Devin behaves during a session.

### `.devin/knowledge/`

These files are loaded into **Devin Knowledge** before the demo runs. They encode BofA-specific engineering standards and ensure every Devin action is policy-compliant rather than based on public defaults.

| File | Loaded as | Key rules |
|---|---|---|
| `angular-standards.md` | `BofA Angular Standards` | Standalone components required; `inject()` over constructor DI; `provideHttpClient()` not `HttpClientModule`; no NgModule in new code |
| `security-policy.md` | `BofA Security Policy` | All interceptors must include audit logging; SSO token chain must be preserved; `CanActivate` must become functional guard; no external auth calls outside `sso-auth.service.ts` |
| `test-standards.md` | `BofA Testing Standards` | Karma/Jasmine deprecated; Jest required; 80% coverage on auth, transaction, and PII paths; edge case tests for null, empty, malformed inputs |

### `.devin/playbooks/`

These files are loaded into **Devin Playbooks** with a macro trigger.

| File | Macro | Purpose |
|---|---|---|
| `angular-upgrade.md` | `!angular-upgrade` | 6-phase Angular 14→18 migration with 2 hard guardrails. Phase 1: analysis + PR approval. Phase 2: shared-ui upgrade + downstream validation. Phases 3–6: standalone migration, RxJS updates, Material v18, Jest. |
| `test-coverage.md` | `!coverage-check` | Weekly automated coverage check across 12 microservices. For any service below 80% on compliance paths, opens a parallel Devin session to write Jest tests. Never auto-merges. |

**Guardrails explicitly encoded in `angular-upgrade.md`:**
- Do not proceed to Phase 2 without PR approval from Platform Engineering Lead and Security Review
- All 8 downstream consumer CI checks must pass before proceeding past Phase 2

### `.devin/skills/`

Executable bash scripts that Devin calls as tools during playbook execution.

| File | Called at | What it does |
|---|---|---|
| `validate-downstream.sh` | Phase 2 guardrail | Runs `npm ci` + `ng build` + `ng test` for all 3 consumer apps. Reports pass/fail per consumer. Exits 1 if any of the 8 checks fail. |
| `check-coverage.sh` | Phase 6 + weekly playbook | Runs Jest with `--coverage` for all 12 services. Parses `coverage-summary.json`. Outputs a Markdown coverage table to `coverage/summary.md`. Exits 1 if any compliance path is below 80%. |

---

## Migration Target Summary

This table shows every Angular 14 legacy pattern in the repo, which phase of the migration Playbook addresses it, and what the Angular 18 replacement is.

| Pattern | File(s) | Phase | Angular 18 Replacement |
|---|---|---:|---|
| `HttpClientModule` | `app.module.ts` (all 3 apps) | 3 | `provideHttpClient()` in `bootstrapApplication()` |
| `RouterModule.forRoot()` | `app-routing.module.ts`, `app.module.ts` | 3 | `provideRouter(routes)` in `app.config.ts` |
| `CanActivate` class guard | `auth.guard.ts` | 3 | `CanActivateFn` functional guard with `inject()` |
| Constructor DI | All services and guards | 3 | `inject()` field assignment |
| `@NgModule` declarations | All `app.module.ts` files | 3 | `standalone: true` + `bootstrapApplication()` |
| `*ngIf` / `*ngFor` directives | `dashboard.component.html` | 3 | `@if` / `@for` built-in control flow |
| `@ViewChild({ static: true })` | `dashboard.component.ts` | 3 | Remove static flag |
| `observable.toPromise()` | `banking-api.service.ts` | 4 | `lastValueFrom(observable)` |
| `combineLatest([...])` array | `fraud-detection.service.ts`, `dashboard.component.ts` | 4 | `combineLatest({ key: obs })` |
| `[matSortActive]` on `mat-table` | `bfa-data-table.component.ts` | 5 | `this.sort.active` in `ngAfterViewInit` |
| `[matSortDirection]` on `mat-table` | `bfa-data-table.component.ts` | 5 | `this.sort.direction` in `ngAfterViewInit` |
| `color="primary"` on MatButton | `bfa-button.component.ts` | 5 | CSS custom properties (MD3) |
| `karma.conf.js` / Jasmine | `karma.conf.js` | 6 | `jest.config.ts` + `jest-preset-angular` |
| `tsconfig.json` `strict: false` | `tsconfig.json` | 1 | Incremental strictness plan |

---

## Downstream Consumer Map

`shared-ui` has **8 downstream consumers**. This is why `shared-ui` must be migrated first and validated before any app-level changes begin.

```
libs/shared-ui
├── apps/retail-banking-portal          (BfaButtonComponent, BfaDataTableComponent, BfaNotificationComponent)
│   ├── src/app/transactions/           (BfaDataTableComponent — mat-table sort bindings)
│   ├── src/app/dashboard/             (BfaNotificationComponent)
│   ├── feature: accounts/             (BfaButtonComponent)
│   └── feature: transfers/            (BfaButtonComponent + BfaNotificationComponent)
├── apps/corporate-dashboard            (SharedUiModule aggregate)
│   └── feature: wire-transfer/        (BfaButtonComponent + BfaNotificationComponent)
└── apps/mobile-api-gateway             (SharedUiModule aggregate)
    └── feature: gateway-status/       (BfaNotificationComponent)
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Angular | 14.3.x |
| UI Components | Angular Material | 14.2.x |
| Reactive programming | RxJS | 6.6.7 |
| Language | TypeScript | 4.7.x |
| Test runner | Karma + Jasmine | 6.4.x (migration target) |
| Package manager | npm | 8.x |
| Build tool | Angular CLI | 14.3.x |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/bofa-digital-banking.git
cd bofa-digital-banking

# Install dependencies for the primary app
cd apps/retail-banking-portal
npm install --legacy-peer-deps

# Run the app (Angular 14)
npx ng serve

# Run tests (Karma — deprecated, to be replaced with Jest in Phase 6)
npx ng test
```

> **Note:** This repo is intentionally Angular 14. The Angular CLI and npm install will produce deprecation warnings — these are expected and are the migration targets.

---

## License

This repository is a demo environment for internal BofA Devin AI evaluation purposes only.
Not for production use. Not affiliated with or endorsed by Bank of America Corporation.
