# Angular 14 → 18 Upgrade Playbook

**Application:** BofA Digital Banking Platform
**Scope:** `retail-banking-portal`, `corporate-dashboard`, `mobile-api-gateway`, `shared-ui`, `shared-data-access`
**Devin Knowledge:** `.devin/knowledge/angular-standards.md`, `security-policy.md`, `test-standards.md`

---

## Recommended Migration Sequence (Overview)

```
Phase 0  →  Phase 1  →  [GUARDRAIL: PR Approval]  →  Phase 2
→  [GUARDRAIL: Downstream Validation]
→  Phase 3a (retail-banking-portal — sequential, highest risk)
→  Phase 3b + 3c (corporate-dashboard + mobile-api-gateway — PARALLEL Devin sessions)
→  Phase 4 (RxJS modernization)
→  Phase 5 (Material v14→v18 cleanup)
→  Phase 6 (Jest migration + coverage)
→  Final Devin Review → Human PR Review
```

---

## Phase 0 — Preparation & Safety Net

**Objective:** Establish a stable baseline, upgrade Node.js and TypeScript, and set up a safety net before any migration work begins.

### Steps

1. **Upgrade Node.js** from 16 (EOL) to **Node 18 LTS** or **Node 20 LTS**:
   - Angular 18 requires Node 18.13+.
   - Update `.nvmrc` or `.node-version` to the target version.
   - Verify CI pipelines use the same Node version.

2. **Lock down the Angular 14 baseline — tag it:**
   ```bash
   git tag angular-14-baseline
   git push origin angular-14-baseline
   ```
   - Verify all existing tests pass on Angular 14 — this is the regression baseline.
   - Record current test coverage numbers for comparison after migration.

3. **TypeScript version alignment:**
   - Angular 18 requires TypeScript 5.4+. Current repo uses TypeScript 4.7.x.
   - Plan incremental strictness: enable `strictNullChecks` and `strictPropertyInitialization` early to surface type issues before the framework upgrade.
   - Update `tsconfig.json` `strict: false` → enable individual strict flags incrementally.

4. **Dry-run Angular update schematics — understand what will change:**
   ```bash
   npx ng update @angular/core@18 @angular/cli@18 --dry-run
   ```
   Review the output to understand what the CLI will auto-migrate and what requires manual intervention.

5. **Set up parallel CI pipeline** (optional but recommended):
   - Configure CI to run both old and new builds during migration so regressions are caught immediately.

---

## Phase 1 — Codebase Analysis & Migration Plan

**Objective:** Full dependency and pattern audit. Open the Migration Plan PR. This is the phase Devin completes BEFORE the demo starts — the PR it opens is shown live in Act 3.

### How to Complete Phase 1 Before the Demo

> **This phase should be pre-run the day before the demo so the output (Migration Plan PR) is ready to show the audience in Act 3.**

**Step-by-step to pre-run Phase 1:**

1. Open a new Devin session connected to `bofa-digital-banking` (practice repo first).
2. Assign Jira ticket `BOFA-4471` to Devin — Devin auto-starts.
3. Attach playbook macro `!angular-upgrade` to the session.
4. In the Devin session, type:
   ```
   Run Phase 1 of the angular-upgrade playbook. Analyse the full monorepo,
   generate the DevinWiki map, and open the Migration Plan PR on GitHub.
   ```
5. Devin runs Ask Devin analysis + DevinWiki, then opens the PR.
6. **Approve the PR in GitHub** — this satisfies the Phase 1 guardrail.
7. Save the session URL — you will open this same session during the live demo to show the completed Phase 1 output.

### Phase 1 Steps (what Devin does)

1. Run **Ask Devin** to analyze the full monorepo:
   - Identify all `@NgModule` declarations across all apps and libs.
   - Identify all `CanActivate` class-based guards.
   - Identify all `HttpClientModule` imports.
   - Identify all `toPromise()` usages (RxJS 6 deprecated).
   - Identify all `combineLatest([...])` array syntax usages.
   - Identify all Angular Material v14-specific APIs (`matSortActive` input binding, `'legacy'` form field appearance).
   - Identify all `karma.conf.js` test runner files.

2. Run **DevinWiki** to generate a migration index:
   - Component-by-component migration checklist.
   - Risk matrix: high (SSO, auth guards, interceptors), medium (RxJS patterns), low (template syntax).
   - Estimated effort per phase.

3. Open a **Migration Plan PR** with:
   - Summary of findings from steps 1–2.
   - Phase breakdown with owners.
   - Rollback strategy per phase.

> **🛑 GUARDRAIL: Do NOT proceed to Phase 2 without PR approval from:**
> - Platform Engineering Lead
> - BofA Security Review (required for any auth-related changes)
>
> **In the demo context:** The PR is approved by you (the presenter) live in front of the audience to show the guardrail working.

---

## Phase 2 — Upgrade `shared-ui` in Isolation

**Objective:** Upgrade the shared component library first to unblock all consumers. This is also pre-completed before the demo — shown as "done" in Act 3.

### How to Complete Phase 2 Before the Demo

> **Pre-run Phase 2 the day before the demo so the completed shared-ui upgrade is visible.**

**Step-by-step to pre-run Phase 2:**

1. After Phase 1 PR is approved, in the same Devin session type:
   ```
   Phase 1 PR is approved. Proceed to Phase 2: upgrade shared-ui to Angular 18,
   fix all Material v18 breaking changes, build shared-ui, then run
   ./.devin/skills/validate-downstream.sh to verify all consumers.
   ```
2. Devin upgrades `shared-ui`, fixes `[matSortActive]`, `[matSortDirection]`, `appearance="legacy"`, and `MatButton` color palette.
3. Devin runs `validate-downstream.sh` — confirm all 8 checks pass in the output.
4. Devin opens Phase 2 PR — review and merge it in GitHub.
5. Save the session state — this completed Phase 2 is shown live in Act 3.

### Incremental Version Strategy

Rather than jumping directly from Angular 14 to 18, use Angular's `ng update` schematics to step through intermediate versions:

1. **14 → 16** (picks up standalone component support, `inject()`, initial deprecations):
   ```bash
   npx ng update @angular/core@16 @angular/cli@16
   npx ng update @angular/material@16
   ```
2. **16 → 18** (final target with full standalone bootstrap, new control flow, MD3):
   ```bash
   npx ng update @angular/core@18 @angular/cli@18
   npx ng update @angular/material@18
   ```

At each step, run `ng update` to apply automatic migrations before making manual fixes.

### Phase 2 Steps (what Devin does)

1. Update `@bofa/shared-ui/package.json` (via incremental `ng update`):
   - `@angular/core` → `^18.0.0`
   - `@angular/material` → `^18.0.0`
   - `@angular/cdk` → `^18.0.0`

2. Fix Angular Material v18 breaking changes in `shared-ui`:
   - `BfaDataTableComponent`: Remove `[matSortActive]` and `[matSortDirection]` table inputs.
     Initialize sort state in `ngAfterViewInit` via `this.sort.active` and `this.sort.direction`.
   - Replace all `appearance="legacy"` form fields with `appearance="outline"`.
   - Update `MatButton` color palette references — `'primary'` and `'warn'` no longer map to
     MD3 theme colors. Use CSS custom properties instead.

3. Build `shared-ui`:
   ```bash
   cd libs/shared-ui && npm run build
   ```

4. Run **validate-downstream.sh** Skill to verify all consumers:
   ```bash
   ./.devin/skills/validate-downstream.sh
   ```

### Regression Checkpoint

Run the full test suite and confirm all tests that passed on the Angular 14 baseline still pass.

> **🛑 GUARDRAIL: All 8 consumer CI checks must pass before proceeding to Phase 3.**
> (3 apps × build + test = 6 checks, plus shared-data-access build and type check = 8 total)
> If any check fails, fix shared-ui and re-run. Do NOT proceed with broken consumers.

---

## Phase 3 — NgModule → Standalone Components

**Objective:** Migrate all app modules to standalone bootstrap. `retail-banking-portal` runs first (sequential). `corporate-dashboard` and `mobile-api-gateway` run in parallel Devin sessions simultaneously.

### Sub-PR Strategy

Split this phase into **one PR per application** to keep reviews manageable and isolate blast radius:

- **PR 3a:** `retail-banking-portal` — runs FIRST, sequential (highest risk — owns SSO auth flow)
- **PR 3b:** `corporate-dashboard` — runs IN PARALLEL with 3c after 3a is merged
- **PR 3c:** `mobile-api-gateway` — runs IN PARALLEL with 3b after 3a is merged

### How to Spin Up Parallel Devin Sessions for Phase 3b + 3c

> **This is the live demo moment in Act 3. Here is exactly how to do it.**

**Step 1 — Complete Phase 3a (retail-banking-portal) first:**

In the existing Devin session, type:
```
Phase 2 guardrail passed. Begin Phase 3a: migrate retail-banking-portal from NgModule to
standalone components. Apply angular-standards.md. Replace AuthGuard with functional guard
per security-policy.md. Open PR 3a when complete.
```
Wait for Devin to open PR 3a. Review and merge it.

**Step 2 — Open the first parallel session (corporate-dashboard):**

1. Go to **app.devin.ai → New Session**
2. Connect to the same `bofa-digital-banking` GitHub repo
3. Attach the `!angular-upgrade` playbook
4. In the session prompt, type:
   ```
   Phase 3a for retail-banking-portal is complete and merged. Begin Phase 3b:
   migrate corporate-dashboard from NgModule to standalone components.
   Apply angular-standards.md. shared-ui is already upgraded to Angular 18.
   Open PR 3b when complete.
   ```

**Step 3 — Open the second parallel session (mobile-api-gateway):**

1. Go to **app.devin.ai → New Session** (open a THIRD session)
2. Connect to the same GitHub repo
3. Attach `!angular-upgrade` playbook
4. Type:
   ```
   Phase 3a for retail-banking-portal is complete and merged. Begin Phase 3c:
   migrate mobile-api-gateway from NgModule to standalone components.
   Apply angular-standards.md. shared-ui is already upgraded to Angular 18.
   Open PR 3c when complete.
   ```

**Step 4 — Show all sessions in the demo:**

- You now have 3 Devin sessions visible simultaneously in app.devin.ai.
- Switch between them to show each working independently.
- This is the parallel throughput moment — 2 apps migrating at the same time, each governed by the same playbook and BofA standards.

### Leverage `ng update` Schematics

Before manual changes in each session, Devin runs Angular's automatic migration schematics:
```bash
npx ng generate @angular/core:standalone
```
This handles many mechanical conversions (standalone flag, imports array, bootstrap migration).

### Steps (per application — what each Devin session does)

1. Convert each `@Component` to `standalone: true`:
   - Add `imports: [...]` array with required modules.
   - Remove from `@NgModule` declarations.
   - Apply `inject()` pattern to replace constructor injection.

2. Migrate routing:
   - Delete `AppRoutingModule`.
   - Create `app.routes.ts` with `Routes` array.
   - Replace class-based `AuthGuard` with functional `authGuard` per `security-policy.md`.

3. Migrate bootstrap:
   - Replace `AppModule` + `bootstrapModule()` with `app.config.ts` + `bootstrapApplication()`.
   - Replace `HttpClientModule` with `provideHttpClient(withInterceptors([auditLoggingInterceptor]))`.
   - Replace `RouterModule.forRoot()` with `provideRouter(routes)`.

4. Update control flow syntax in all templates:
   - `*ngIf` → `@if / @else`
   - `*ngFor` → `@for ... track`
   - `*ngSwitch` → `@switch / @case`

5. PR must include: type-check passing, no NgModule declarations in new code,
   `security-policy.md` compliance verified for SSO token chain.

### Regression Checkpoint

After each sub-PR, run the full test suite + `validate-downstream.sh` to confirm no regressions.

---

## Phase 4 — RxJS 6 → 7 Pattern Updates

**Objective:** Replace all deprecated RxJS 6 patterns in `shared-data-access` and `dashboard` with RxJS 7 equivalents.

### Migration Map

| RxJS 6 Pattern | RxJS 7+ Replacement | Files Affected |
|---|---|---|
| `observable.toPromise()` | `lastValueFrom(observable)` | `banking-api.service.ts` |
| `combineLatest([obs1, obs2])` | `combineLatest({ key1: obs1, key2: obs2 })` | `fraud-detection.service.ts`, `dashboard.component.ts` |
| `throwError('string')` | `throwError(() => new Error('string'))` | `sso-auth.service.ts` |

### Steps

1. Update `rxjs` in all `package.json` files: `"rxjs": "~7.8.0"`.

2. Find and replace `toPromise()`:
   ```typescript
   // Before (RxJS 6)
   return this.http.get<T>(url).toPromise();

   // After (RxJS 7)
   import { lastValueFrom } from 'rxjs';
   return lastValueFrom(this.http.get<T>(url));
   ```
   > ⚠️ Note: `lastValueFrom` throws `EmptyError` on empty observables instead of resolving `undefined` like `toPromise()`. Update any code that depends on the undefined fallback.

3. Find and replace `combineLatest` array syntax:
   ```typescript
   // Before (RxJS 6)
   combineLatest([signals$, profile$]).pipe(
     map(([signals, profile]) => ...)
   )

   // After (RxJS 7)
   combineLatest({ signals: signals$, profile: profile$ }).pipe(
     map(({ signals, profile }) => ...)
   )
   ```

4. Run full test suite after changes to verify no regression in async behavior.

### Regression Checkpoint

Pay special attention to async tests — `lastValueFrom` behaves differently from `toPromise()` on empty observables.

---

## Phase 5 — Angular Material v14 → v18 API Updates

**Objective:** Fix all remaining Material API changes not covered in Phase 2's shared-ui upgrade.

### Key Breaking Changes

| Component | v14 API | v18 API |
|---|---|---|
| `mat-table` | `[matSortActive]="col"` input | `this.sort.active = 'col'` in `ngAfterViewInit` |
| `mat-table` | `[matSortDirection]="'desc'"` input | `this.sort.direction = 'desc'` |
| `mat-form-field` | `appearance="legacy"` | Removed — use `appearance="outline"` |
| `mat-button` | `color="primary"` ThemePalette | MD3 uses CSS custom properties |
| `MatSortChange` event | `Sort` type | `SortState` type in v18 |

### Steps

1. Search for all `[matSortActive]` and `[matSortDirection]` template bindings — move to `ngAfterViewInit`.
2. Search for `appearance="legacy"` — replace with `appearance="outline"` or `appearance="fill"`.
3. Update all `(matSortChange)` event handlers: `$event: Sort` → `$event: SortState`.
4. Verify Angular Material theming: migrate from `mat.define-legacy-theme()` to `mat.define-theme()`.

### Regression Checkpoint

Run the full test suite + visually verify Material component rendering in all 3 apps. Confirm sort behavior, form field styling, and button theming are correct.

---

## Phase 6 — Jest Migration (Replace Karma/Jasmine)

**Objective:** Replace Karma/Jasmine with Jest per `test-standards.md`. Ensure ≥80% coverage on compliance paths.

### Steps

1. For each application:
   - Delete `karma.conf.js` and `src/test.ts`.
   - Install Jest:
     ```bash
     npm uninstall karma karma-chrome-launcher karma-jasmine karma-jasmine-html-reporter karma-coverage
     npm install --save-dev jest jest-environment-jsdom jest-preset-angular @types/jest ts-jest
     ```
   - Add `jest.config.ts` and `setup-jest.ts`.
   - Update `tsconfig.spec.json` to use Jest types.

2. Migrate all existing `*.spec.ts` files:
   - Replace Jasmine `spyOn()` → `jest.spyOn()`.
   - Replace `jasmine.createSpy()` → `jest.fn()`.
   - Replace `done()` async pattern → `async/await` with Jest.

3. Run **check-coverage.sh** Skill:
   ```bash
   ./.devin/skills/check-coverage.sh
   ```
   For any service below 80% on compliance paths, a parallel Devin session is spun up
   automatically per the `test-coverage.md` playbook.

4. Open **Final Upgrade PR** containing:
   - All Phase 1–6 changes squashed per-application.
   - Devin Review results attached.
   - Coverage report from `check-coverage.sh` showing ≥80% on all compliance paths.
   - Sign-off from Platform Security (required for SSO/auth changes).

5. Run **Devin Review** before human PR review:
   - Devin self-reviews the PR against `angular-standards.md`, `security-policy.md`, and `test-standards.md`.
   - All PASS results and any flagged items are included in the PR description.

---

## Appendix — What to Pre-Run Before the Demo

| Phase | Pre-run before demo? | What to show live |
|---|---|---|
| Phase 0 | ✅ Yes — complete silently | Not shown in demo |
| Phase 1 | ✅ Yes — run analysis + open PR | Show the completed PR in Act 3 |
| Phase 2 | ✅ Yes — run upgrade + validate | Show "Phase 2 complete" badge in Act 3 |
| Phase 3a | ✅ Yes — complete retail-banking-portal | Show merged PR 3a in Act 3 |
| Phase 3b + 3c | ❌ No — spin up LIVE in the demo | **This is the parallel sessions moment in Act 3** |
| Phase 4–6 | ❌ No — describe as next steps | Shown conceptually in Act 5 scheduled sessions |

---

## Appendix — Summary of All Improvements vs Original Playbook

| Improvement | Where Applied |
|---|---|
| Phase 0 added — preparation & safety net | New phase before Phase 1 |
| Incremental version stepping (14→16→18) using `ng update` | Phase 2 |
| Explicit pre-run instructions for Phase 1 + 2 before demo | Phase 1, Phase 2 |
| Step-by-step instructions for spinning up parallel Devin sessions | Phase 3 |
| Sub-PR strategy: 3a sequential, 3b+3c parallel | Phase 3 |
| Regression checkpoints after every phase | Phases 2–5 |
| `lastValueFrom` EmptyError warning | Phase 4 |
| Final Devin Review step before human PR review | Phase 6 |
