# Angular 14 → 18 Migration Plan

**Application:** BofA Digital Banking Platform
**Scope:** `retail-banking-portal`, `corporate-dashboard`, `mobile-api-gateway`, `shared-ui`, `shared-data-access`
**Date:** 2026-05-18
**Author:** Devin (Phase 1 — Codebase Analysis)
**Standards:** `angular-standards.md`, `security-policy.md`, `test-standards.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Detailed Findings](#3-detailed-findings)
4. [Component-by-Component Migration Checklist](#4-component-by-component-migration-checklist)
5. [Risk Matrix](#5-risk-matrix)
6. [Phase Breakdown with Owners](#6-phase-breakdown-with-owners)
7. [Estimated Effort per Phase](#7-estimated-effort-per-phase)
8. [Rollback Strategy](#8-rollback-strategy)
9. [Guardrails & Approval Gates](#9-guardrails--approval-gates)

---

## 1. Executive Summary

This document presents the full codebase analysis for migrating the BofA Digital Banking monorepo from **Angular 14.3.x** to **Angular 18.x**. The analysis covers 3 applications, 2 shared libraries, and 24 TypeScript source files.

### Key Metrics

| Metric | Count |
|---|---|
| Total TypeScript source files | 24 |
| `@NgModule` declarations to remove | 5 |
| Components to convert to standalone | 9 |
| Class-based guards to migrate | 2 (retail + corporate) |
| `HttpClientModule` imports to replace | 3 |
| Constructor injection sites to migrate | 7 |
| `toPromise()` usages (RxJS 6) | 1 |
| `combineLatest([])` array syntax usages | 3 |
| Angular Material v14 API usages to update | 4 |
| `karma.conf.js` files to replace with Jest | 1 present + 3 referenced in scripts |
| `*ngIf` / `*ngFor` template directives | 14 |
| `tsconfig.json` with `strict: false` | 1 |

### Technology Versions (Current → Target)

| Layer | Current | Target |
|---|---|---|
| Angular | 14.3.x | 18.x |
| Angular Material | 14.2.7 | 18.x |
| Angular CDK | 14.2.7 | 18.x |
| RxJS | 6.6.7 | ~7.8.0 |
| TypeScript | 4.7.2 | 5.4+ |
| Node.js | 16 (EOL) | 18 LTS or 20 LTS |
| Test Runner | Karma 6.4 + Jasmine 4.2 | Jest + jest-preset-angular |
| Zone.js | 0.11.4 | 0.14.x |

---

## 2. Current State Audit

### 2.1 `@NgModule` Declarations (5 total)

| # | File | Module Name | Declares | Notes |
|---|---|---|---|---|
| 1 | `apps/retail-banking-portal/src/app/app.module.ts:42` | `AppModule` | `AppComponent`, `DashboardComponent`, `TransactionListComponent` | Root module; imports `HttpClientModule`, `SharedUiModule`, `AppRoutingModule`; provides `AuditLoggingInterceptor` via `HTTP_INTERCEPTORS` |
| 2 | `apps/retail-banking-portal/src/app/app-routing.module.ts:52` | `AppRoutingModule` | — | `RouterModule.forRoot()` with `relativeLinkResolution: 'legacy'` (removed in Angular 16) |
| 3 | `apps/corporate-dashboard/src/app/app.module.ts:25` | `AppModule` | `AppComponent`, `CorporateDashboardComponent`, `WireTransferComponent` | Inline `RouterModule.forRoot()` with route definitions; imports `SharedUiModule` |
| 4 | `apps/mobile-api-gateway/src/app/app.module.ts:22` | `AppModule` | `AppComponent`, `MobileGatewayStatusComponent` | Inline `RouterModule.forRoot()`; imports `SharedUiModule` |
| 5 | `libs/shared-ui/src/lib/shared-ui.module.ts:22` | `SharedUiModule` | `BfaButtonComponent`, `BfaDataTableComponent`, `BfaNotificationComponent` | Aggregation module consumed by all 3 apps |

### 2.2 `CanActivate` Class-Based Guards (2 total)

| # | File | Class | Consumed By | Security Notes |
|---|---|---|---|---|
| 1 | `apps/retail-banking-portal/src/app/auth/auth.guard.ts:47` | `AuthGuard` | `app-routing.module.ts` (dashboard, transactions routes) | Calls `SsoAuthService.isAuthenticated()`, `initiateSamlLogin(state.url)` preserving RelayState, role-based access via `route.data['requiresRole']` |
| 2 | `apps/corporate-dashboard/src/app/auth/auth.guard.ts` (imported at `app.module.ts:12`) | `AuthGuard` | `app.module.ts` routes (corporate-dashboard, wire-transfer) | Separate guard file for corporate app |

**Security-critical:** Both guards must preserve SSO token chain per `security-policy.md`. Migration to `CanActivateFn` must use `inject(SsoAuthService)` — no direct external auth calls.

### 2.3 `HttpClientModule` Imports (3 total)

| # | File | Line | Replacement |
|---|---|---|---|
| 1 | `apps/retail-banking-portal/src/app/app.module.ts` | 52 | `provideHttpClient(withInterceptors([auditLoggingInterceptor]))` |
| 2 | `apps/corporate-dashboard/src/app/app.module.ts` | 35 | `provideHttpClient(withInterceptors([auditLoggingInterceptor]))` |
| 3 | `apps/mobile-api-gateway/src/app/app.module.ts` | 30 | `provideHttpClient(withInterceptors([auditLoggingInterceptor]))` |

All three apps also register `AuditLoggingInterceptor` via the class-based `HTTP_INTERCEPTORS` multi-provider pattern. This must be converted to the functional `HttpInterceptorFn` form per `security-policy.md`.

### 2.4 `toPromise()` Usages — RxJS 6 Deprecated (1 total)

| # | File | Line | Code | Replacement |
|---|---|---|---|---|
| 1 | `libs/shared-data-access/src/lib/api/banking-api.service.ts` | 93 | `.toPromise()` | `lastValueFrom(this.http.get<AccountSummary[]>(...))` |

**Note:** `lastValueFrom` throws `EmptyError` on empty observables instead of resolving `undefined`. The return type changes from `Promise<AccountSummary[] | undefined>` to `Promise<AccountSummary[]>`. Callers relying on the `undefined` fallback must be updated.

### 2.5 `combineLatest([...])` Array Syntax (3 total)

| # | File | Line | Code | Replacement |
|---|---|---|---|---|
| 1 | `apps/retail-banking-portal/src/app/dashboard/dashboard.component.ts` | 87 | `combineLatest([this.bankingApi.getAccountSummaries(), this.analyticsService.getSpendingScore()])` | `combineLatest({ accounts: ..., spendingScore: ... })` |
| 2 | `libs/shared-data-access/src/lib/api/fraud-detection.service.ts` | 81 | `combineLatest([signals$, profile$])` | `combineLatest({ signals: signals$, profile: profile$ })` |
| 3 | `libs/shared-data-access/src/lib/api/fraud-detection.service.ts` | 98 | `combineLatest(signalObservables)` — dynamic array | Remains array (dynamic observables); no object syntax alternative |

### 2.6 Angular Material v14-Specific APIs (4 categories)

| # | Pattern | File | Line(s) | v18 Replacement |
|---|---|---|---|---|
| 1 | `[matSortActive]` input binding | `libs/shared-ui/src/lib/data-table/bfa-data-table.component.ts` | 68 | `this.sort.active = '...'` in `ngAfterViewInit` |
| 2 | `[matSortDirection]` input binding | `libs/shared-ui/src/lib/data-table/bfa-data-table.component.ts` | 69 | `this.sort.direction = '...'` in `ngAfterViewInit` |
| 3 | `color="primary"` / `color="warn"` ThemePalette | `libs/shared-ui/src/lib/button/bfa-button.component.ts:36`, `apps/retail-banking-portal/src/app/app.component.html:1`, `dashboard.component.html:23` | — | CSS custom properties (MD3) |
| 4 | `Sort` event type | `libs/shared-ui/src/lib/data-table/bfa-data-table.component.ts:12,145,161` | — | `SortState` type in v18 |

**No `appearance="legacy"` found** — the existing form field in `transaction-list.component.html:5` already uses `appearance="outline"`.

### 2.7 `karma.conf.js` Test Runner Files (1 present, 3 referenced)

| # | File | Status |
|---|---|---|
| 1 | `apps/retail-banking-portal/karma.conf.js` | File exists (48 lines) |
| 2 | `apps/corporate-dashboard/package.json` script `"test": "karma start karma.conf.js"` | Referenced but file not yet created |
| 3 | `apps/mobile-api-gateway/package.json` script `"test": "karma start karma.conf.js"` | Referenced but file not yet created |
| 4 | `libs/shared-ui/package.json` script `"test": "karma start karma.conf.js"` | Referenced but file not yet created |

No `*.spec.ts` test files exist in the repo currently. The Karma config and test scripts serve as migration target markers for Phase 6 (Jest migration).

### 2.8 Additional Legacy Patterns

#### Constructor Injection (7 sites — all must migrate to `inject()`)

| # | File | Constructor Params |
|---|---|---|
| 1 | `retail-banking-portal/src/app/auth/auth.guard.ts:50` | `SsoAuthService`, `Router` |
| 2 | `retail-banking-portal/src/app/auth/sso-auth.service.ts:55` | `HttpClient` |
| 3 | `retail-banking-portal/src/app/core/interceptors/audit-logging.interceptor.ts:17` | `SsoAuthService` |
| 4 | `retail-banking-portal/src/app/dashboard/dashboard.component.ts:72` | `BankingApiService`, `AnalyticsService`, `SsoAuthService`, `ChangeDetectorRef` |
| 5 | `retail-banking-portal/src/app/transactions/transaction-list.component.ts:76` | `BankingApiService`, `ActivatedRoute`, `ChangeDetectorRef` |
| 6 | `libs/shared-data-access/src/lib/api/banking-api.service.ts:62` | `HttpClient` |
| 7 | `libs/shared-data-access/src/lib/api/fraud-detection.service.ts:62` | `HttpClient` |
| 8 | `retail-banking-portal/src/app/analytics/analytics.service.ts:59` | `HttpClient` |

#### `@ViewChild({ static: true })` (2 sites)

| # | File | Line | Fix |
|---|---|---|---|
| 1 | `dashboard.component.ts` | 53 | Remove `{ static: true }` → `@ViewChild('balanceSummaryPanel')` |
| 2 | `dashboard.component.ts` | 56 | Remove `{ static: true }` → `@ViewChild('chartCanvas')` |

#### `*ngIf` / `*ngFor` Structural Directives (14 usages)

| File | Count | Directives |
|---|---|---|
| `dashboard.component.html` | 5 | 3× `*ngIf`, 2× `*ngFor` |
| `transaction-list.component.html` | 4 | 3× `*ngIf`, 1× table-specific |
| `bfa-data-table.component.ts` (inline template) | 5 | `*ngFor`, `*ngIf`, `*matHeaderCellDef`, `*matCellDef`, etc. |

#### `RouterModule.forRoot()` with Legacy Options

| File | Legacy Option |
|---|---|
| `app-routing.module.ts:49` | `relativeLinkResolution: 'legacy'` — **removed in Angular 16**; must be deleted |
| `app-routing.module.ts:48` | `enableTracing: false` — migrate to `withDebugTracing()` for dev only |

#### `bootstrapModule()` Usage

| File | Line |
|---|---|
| `retail-banking-portal/src/main.ts` | 11 — `platformBrowserDynamic().bootstrapModule(AppModule)` → `bootstrapApplication(AppComponent, appConfig)` |

#### TypeScript Strictness

| File | Setting | Target |
|---|---|---|
| `retail-banking-portal/tsconfig.json` | `strict: false` | Enable incrementally: `strictNullChecks`, `strictPropertyInitialization` first |
| Same file | `strictTemplates: false` | Enable after standalone migration |
| Same file | `strictInjectionParameters: false` | Enable after `inject()` migration |

#### Class-Based `HttpInterceptor` (3 apps)

Each app has its own `AuditLoggingInterceptor` registered via the `HTTP_INTERCEPTORS` multi-provider token. All must be converted to the functional `HttpInterceptorFn` form per `security-policy.md`.

| App | Interceptor File |
|---|---|
| `retail-banking-portal` | `src/app/core/interceptors/audit-logging.interceptor.ts` |
| `corporate-dashboard` | `src/app/core/interceptors/audit-logging.interceptor.ts` (imported) |
| `mobile-api-gateway` | `src/app/core/interceptors/audit-logging.interceptor.ts` (imported) |

---

## 3. Detailed Findings

### 3.1 SSO / Auth Flow (HIGH RISK)

The SSO authentication flow is the highest-risk migration surface:

- **`SsoAuthService`** (`retail-banking-portal/src/app/auth/sso-auth.service.ts`) — 212 lines. Manages SAML SP-initiated SSO, token validation, refresh, and logout. Uses `BehaviorSubject<AuthState>` for reactive state. Constructor injection of `HttpClient`.
- **`AuthGuard`** (`retail-banking-portal/src/app/auth/auth.guard.ts`) — 77 lines. Class-based `CanActivate` with role-based access control. Preserves `state.url` as SAML `RelayState`.
- **`AuditLoggingInterceptor`** (`retail-banking-portal/src/app/core/interceptors/audit-logging.interceptor.ts`) — 57 lines. Class-based `HttpInterceptor`. Attaches `X-Correlation-ID` and `X-Client-App` headers. Logs sanitized URLs.

**Migration requirements per `security-policy.md`:**
1. Functional guard must call `inject(SsoAuthService).isAuthenticated()` only
2. `RelayState` preservation is mandatory (`state.url` passed to `initiateSamlLogin`)
3. No external auth calls outside `SsoAuthService`
4. Interceptor must be converted to `HttpInterceptorFn` with `inject(SsoAuthService)`

### 3.2 Shared Library Impact Analysis

**`shared-ui`** (highest migration surface — 8 downstream consumers):
- 3 components: `BfaButtonComponent`, `BfaDataTableComponent`, `BfaNotificationComponent`
- All declared in `SharedUiModule` — must convert to standalone
- `BfaDataTableComponent` uses Material v14-specific `[matSortActive]`/`[matSortDirection]` inputs
- `BfaButtonComponent` uses `color="primary"` ThemePalette (removed in Material v18 MD3)

**`shared-data-access`** (deferred to Phase 4):
- 2 services: `BankingApiService`, `FraudDetectionService`
- Contains the only `toPromise()` usage and 2 of 3 `combineLatest([])` usages
- Peer deps pin `@angular/core@^14.3.0` — must stay on Angular 14 through Phases 2-3
- Phase 4 bumps peers to `^18.0.0` and migrates RxJS patterns

### 3.3 Analytics SDK Integration

`AnalyticsService` wraps a proprietary `window.BofAAnalyticsSDK` global. The `from(Promise)` pattern used is already RxJS 7-compatible — no `toPromise()` migration needed. Constructor injection of `HttpClient` still requires `inject()` migration.

---

## 4. Component-by-Component Migration Checklist

### `apps/retail-banking-portal`

| Component/Service | Phase | standalone | inject() | Control Flow | Material v18 | RxJS 7 | Jest |
|---|---|---|---|---|---|---|---|
| `AppComponent` | 3a | Convert | N/A | — | `color="primary"` on toolbar | — | 6 |
| `DashboardComponent` | 3a | Convert | 4 params | 5× `*ngIf`/`*ngFor` → `@if`/`@for` | `color="warn"` on icon | `combineLatest` array → object | 6 |
| `TransactionListComponent` | 3a | Convert | 3 params | 4× `*ngIf` | — | — | 6 |
| `AuthGuard` → `authGuard` | 3a | N/A (fn) | 2 params | — | — | — | 6 |
| `SsoAuthService` | 3a | N/A | 1 param | — | — | — | 6 |
| `AuditLoggingInterceptor` → fn | 3a | N/A (fn) | 1 param | — | — | — | 6 |
| `AnalyticsService` | 3a | N/A | 1 param | — | — | — | 6 |
| `AppRoutingModule` → `app.routes.ts` | 3a | Delete | — | — | — | — | — |
| `AppModule` → `app.config.ts` | 3a | Delete | — | — | — | — | — |

### `apps/corporate-dashboard`

| Component/Service | Phase | standalone | inject() | Material v18 | Jest |
|---|---|---|---|---|---|
| `AppComponent` | 3b | Convert | — | — | 6 |
| `CorporateDashboardComponent` | 3b | Convert | TBD | — | 6 |
| `WireTransferComponent` | 3b | Convert | TBD | — | 6 |
| `AuthGuard` → `authGuard` | 3b | N/A (fn) | — | — | 6 |
| `AppModule` → `app.config.ts` | 3b | Delete | — | — | — |

### `apps/mobile-api-gateway`

| Component/Service | Phase | standalone | inject() | Material v18 | Jest |
|---|---|---|---|---|---|
| `AppComponent` | 3c | Convert | — | — | 6 |
| `MobileGatewayStatusComponent` | 3c | Convert | TBD | — | 6 |
| `AppModule` → `app.config.ts` | 3c | Delete | — | — | — |

### `libs/shared-ui`

| Component | Phase | standalone | Material v18 | Notes |
|---|---|---|---|---|
| `BfaButtonComponent` | 2 | Convert | `color="primary"` → CSS custom props | MD3 theme migration |
| `BfaDataTableComponent` | 2 | Convert | `[matSortActive]`/`[matSortDirection]` → `ngAfterViewInit`; `Sort` → `SortState` | Highest-risk shared component |
| `BfaNotificationComponent` | 2 | Convert | — | Uses `HostBinding` |
| `SharedUiModule` | 2 | Keep as re-export barrel | — | Thin wrapper during transition |

### `libs/shared-data-access`

| Service | Phase | inject() | RxJS 7 | Notes |
|---|---|---|---|---|
| `BankingApiService` | 4 | 1 param | `toPromise()` → `lastValueFrom()` | Return type changes |
| `FraudDetectionService` | 4 | 1 param | 2× `combineLatest([])` → object/kept | Dynamic array stays as-is |

---

## 5. Risk Matrix

| ID | Item | Risk Level | Impact | Probability | Mitigation |
|---|---|---|---|---|---|
| R1 | SSO token chain break during `AuthGuard` → `authGuard` migration | **HIGH** | Auth flow broken for all users | Medium | Follow `security-policy.md` pattern exactly; verify `RelayState` preserved; security review gate |
| R2 | `AuditLoggingInterceptor` class → fn conversion drops correlation ID | **HIGH** | Compliance violation — audit trail broken | Low | Verify `X-Correlation-ID` header in interceptor tests; compare request headers before/after |
| R3 | `shared-ui` Material v18 breaking changes propagate to 8 consumers | **HIGH** | All 3 apps fail to build | Medium | Phase 2 guardrail: `validate-downstream.sh` must pass all 8 checks before Phase 3 |
| R4 | `[matSortActive]`/`[matSortDirection]` removal breaks data table sort | **MEDIUM** | Transaction table unsortable | High | Move initialization to `ngAfterViewInit`; verify sort state in integration tests |
| R5 | `toPromise()` → `lastValueFrom()` behavior change on empty observables | **MEDIUM** | `EmptyError` thrown where `undefined` was expected | Medium | Update callers; add unit tests for empty observable case |
| R6 | `combineLatest` array → object syntax regression | **MEDIUM** | Fraud detection or dashboard fails | Low | Type-safe destructuring; existing subscription patterns preserved |
| R7 | `relativeLinkResolution: 'legacy'` removal | **LOW** | Routing behavior change | Low | Option removed in Angular 16; test all route transitions |
| R8 | `color="primary"` ThemePalette removal (Material v18 MD3) | **LOW** | Buttons/toolbar lose styling | High | Apply CSS custom properties per MD3 theming guide |
| R9 | TypeScript 4.7 → 5.4+ strictness regressions | **LOW** | Build failures from new strict checks | Medium | Enable strict flags incrementally; fix type errors per phase |
| R10 | Karma → Jest migration breaks existing test patterns | **LOW** | Test suite non-functional during migration | Low | Phase 6 is isolated; no functional code changes |

---

## 6. Phase Breakdown with Owners

### Phase 0 — Preparation & Safety Net
**Owner:** Devin (current session)
- Upgrade Node.js 16 → 18 LTS / 20 LTS
- Tag `angular-14-baseline`
- Update `.nvmrc` / `.node-version`
- TypeScript strictness planning
- Dry-run `ng update` schematics

### Phase 1 — Codebase Analysis & Migration Plan (THIS PHASE)
**Owner:** Devin (current session)
- Full dependency and pattern audit (**COMPLETE** — this document)
- Migration index and risk matrix (**COMPLETE** — sections 4-5)
- Open Migration Plan PR

### Phase 2 — Upgrade `shared-ui` in Isolation
**Owner:** Devin session
**Approvers:** Platform Engineering Lead, BofA Security Review
- Increment: Angular 14 → 16 → 18 via `ng update` schematics
- Update `shared-ui` peer deps + Material v18 API fixes
- `BfaDataTableComponent`: `[matSortActive]`/`[matSortDirection]` → `ngAfterViewInit`
- `BfaButtonComponent`: `color="primary"` → CSS custom properties
- Run `validate-downstream.sh` with Patch A (lockfile fallback) and Patch B (`shared-data-access` soft-pass)
- **GUARDRAIL:** All 8 consumer checks must pass

### Phase 3a — `retail-banking-portal` Standalone Migration (Sequential)
**Owner:** Devin (parent session)
- Convert all components to `standalone: true`
- Replace `AuthGuard` class → `authGuard` functional guard (security-critical)
- Replace `AppModule` → `bootstrapApplication()` + `app.config.ts`
- Replace `HttpClientModule` → `provideHttpClient(withInterceptors(...))`
- Replace `RouterModule.forRoot()` → `provideRouter(routes)`
- Convert `AuditLoggingInterceptor` to `HttpInterceptorFn`
- Update control flow: `*ngIf` → `@if`, `*ngFor` → `@for`
- Remove `@ViewChild({ static: true })`
- Delete `relativeLinkResolution: 'legacy'`

### Phase 3b — `corporate-dashboard` (Parallel Child Session)
**Owner:** Devin child session
- Same standalone migration pattern as 3a
- Replace class-based `AuthGuard` with functional guard
- Run after 3a is merged

### Phase 3c — `mobile-api-gateway` (Parallel Child Session)
**Owner:** Devin child session
- Same standalone migration pattern as 3a (simpler — no auth guard)
- Run in parallel with 3b after 3a is merged

### Phase 4 — RxJS 6 → 7 + `shared-data-access` Upgrade
**Owner:** Devin session
- Bump `shared-data-access` peer deps to `@angular/core@^18.0.0`
- `toPromise()` → `lastValueFrom()` in `banking-api.service.ts`
- `combineLatest([])` → `combineLatest({})` in `fraud-detection.service.ts` and `dashboard.component.ts`
- Update `rxjs` to `~7.8.0` in all `package.json` files
- Verify `validate-downstream.sh` no longer soft-passes `shared-data-access`

### Phase 5 — Angular Material v14 → v18 API Cleanup
**Owner:** Devin session
- Finalize any remaining `[matSortActive]`/`[matSortDirection]` usages
- `Sort` → `SortState` event type
- `mat.define-legacy-theme()` → `mat.define-theme()`
- Visual verification of Material components across all 3 apps

### Phase 6 — Jest Migration (Replace Karma/Jasmine)
**Owner:** Devin session
- Delete `karma.conf.js` and `src/test.ts`
- Install Jest + `jest-preset-angular`
- Add `jest.config.ts` and `setup-jest.ts`
- Migrate Jasmine spies → Jest mocks
- Run `check-coverage.sh` — enforce 80% on compliance paths
- Spin up parallel sessions for any service below threshold

---

## 7. Estimated Effort per Phase

| Phase | Scope | Files Changed | Estimated Complexity | Dependencies |
|---|---|---|---|---|
| 0 | Node.js + TS prep | 3-5 config files | Low | None |
| 1 | Analysis + plan | 1 doc (this PR) | Low | None |
| 2 | `shared-ui` upgrade | ~8 files | Medium | Phase 0 |
| 3a | `retail-banking-portal` standalone | ~12 files | **High** (SSO auth) | Phase 2 |
| 3b | `corporate-dashboard` standalone | ~5 files | Medium | Phase 3a merged |
| 3c | `mobile-api-gateway` standalone | ~4 files | Low | Phase 3a merged |
| 4 | RxJS + `shared-data-access` | ~6 files | Medium | Phase 3 complete |
| 5 | Material v18 cleanup | ~5 files | Low-Medium | Phase 4 |
| 6 | Jest migration | ~10 files | Medium | Phase 5 |

**Total estimated files touched:** ~55 file modifications across all phases.

---

## 8. Rollback Strategy

Each phase has an independent rollback path:

| Phase | Rollback Method | Impact |
|---|---|---|
| 0 | Revert Node.js version, restore `tsconfig.json` | None — no runtime changes |
| 2 | `git revert` the Phase 2 PR; restore `shared-ui` peer deps to `^14.x` | All consumers revert to Angular 14 shared-ui |
| 3a | `git revert` PR 3a; restore `AppModule` + `AuthGuard` class | retail-banking-portal returns to NgModule bootstrap |
| 3b/3c | `git revert` individual PRs | Independent per app |
| 4 | `git revert` Phase 4 PR; restore `shared-data-access` peers to `^14.x` | RxJS patterns revert; soft-pass reactivated |
| 5 | `git revert` Phase 5 PR | Material APIs revert to v14 patterns |
| 6 | `git revert` Phase 6 PR; restore `karma.conf.js` | Test runner reverts to Karma |

**Baseline tag:** `angular-14-baseline` (to be created in Phase 0) provides a full-repo snapshot for disaster recovery.

---

## 9. Guardrails & Approval Gates

### Gate 1: Phase 1 → Phase 2
- **Requirement:** This Migration Plan PR must be approved by:
  - Platform Engineering Lead
  - BofA Security Review (required for any auth-related changes)
- **Enforcement:** PR approval required before any code changes begin

### Gate 2: Phase 2 → Phase 3
- **Requirement:** All 8 downstream consumer checks must pass via `validate-downstream.sh`:
  - `retail-banking-portal`: build + test (2 checks)
  - `corporate-dashboard`: build + test (2 checks)
  - `mobile-api-gateway`: build + test (2 checks)
  - `shared-data-access`: build + type-check (2 checks) — soft-pass allowed in Phase 2
- **Enforcement:** Script exits non-zero if any check fails

### Gate 3: Phase 3a → Phase 3b/3c
- **Requirement:** PR 3a merged to `main`; `retail-banking-portal` builds and tests pass
- **Enforcement:** Child sessions only launch after 3a merge confirmed

### Gate 4: Final Merge
- **Requirement:** Devin Review against `angular-standards.md`, `security-policy.md`, `test-standards.md`
- **Requirement:** Coverage ≥80% on all compliance paths per `check-coverage.sh`
- **Requirement:** Platform Security sign-off on SSO/auth changes
