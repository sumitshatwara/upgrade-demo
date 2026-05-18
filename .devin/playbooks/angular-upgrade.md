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
→  Phase 3b + 3c (corporate-dashboard + mobile-api-gateway — PARALLEL child sessions)
→  Phase 4 (RxJS modernization + shared-data-access upgrade)
→  Phase 5 (Material v14→v18 cleanup)
→  Phase 6 (Jest migration + coverage)
→  Final Devin Review → Human PR Review
```

**Lib migration order:** `shared-ui` upgrades in Phase 2. `shared-data-access` stays on Angular 14 peer deps through Phases 2–3 and is migrated in Phase 4 alongside RxJS. The Phase 2 guardrail accommodates this — see Phase 2 below.

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

**Objective:** Full dependency and pattern audit. Open the Migration Plan PR.

### Steps

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

---

## Phase 2 — Upgrade `shared-ui` in Isolation

**Objective:** Upgrade the shared component library first to unblock consumers. `shared-data-access` stays on Angular 14 peers in this phase and is upgraded in Phase 4.

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

### Steps

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

### Guardrail Patches Often Required in Phase 2

The `validate-downstream.sh` skill needs two adjustments the first time it runs against a partially-migrated tree. Apply these as small, separately-reviewable patches stacked on the Phase 2 PR:

**Patch A — Lockfile fallback.** If a consumer is missing `package-lock.json` (common after `ng update` rewrites deps), `npm ci` fails. Replace each install site with a helper that falls back to `npm install --no-audit --no-fund --legacy-peer-deps` and prints a yellow warning so the non-reproducible path is visible in CI logs. Both branches pass `--legacy-peer-deps` because Material v18 peers on `@angular/forms` that some consumers haven't bumped yet.

```sh
npm_install_or_ci() {
  if [ -f package-lock.json ]; then
    npm ci --legacy-peer-deps
  else
    echo -e "\033[33m⚠ No package-lock.json — falling back to npm install\033[0m"
    npm install --no-audit --no-fund --legacy-peer-deps
  fi
}
```

**Patch B — `shared-data-access` Angular 14 soft-pass.** `shared-data-access` does not migrate until Phase 4. In Phase 2 its peer `@angular/core` is still `^14.x` and it cannot build against Angular 18 sources. Read its `peerDependencies['@angular/core']` from `package.json` via `node -p`; if it starts with `^14`, emit a yellow `⚠ shared-data-access build SOFT-PASSED (Angular 14 baseline)` line and continue. When Phase 4 bumps the peer to `^18.0.0`, the conditional falls through to the real build path automatically.

```sh
ngcore_peer=$(node -p "require('./libs/shared-data-access/package.json').peerDependencies['@angular/core']")
case "$ngcore_peer" in
  ^14.*)
    echo -e "\033[33m⚠ shared-data-access build SOFT-PASSED (Angular 14 baseline)\033[0m"
    ;;
  *)
    (cd libs/shared-data-access && npm run build)
    ;;
esac
```

The same soft-pass pattern applies to any consumer app that still pins `@angular/core@^14` while waiting on a later phase.

### Regression Checkpoint

Run the full test suite and confirm all tests that passed on the Angular 14 baseline still pass.

> **🛑 GUARDRAIL: All 8 consumer checks must pass (or soft-pass per Patch B) before proceeding to Phase 3.**
> (3 apps × build + test = 6 checks, plus shared-data-access build and type check = 8 total)
> If any check fails, fix shared-ui and re-run. Do NOT proceed with broken consumers.

---

## Phase 3 — NgModule → Standalone Components

**Objective:** Migrate all app modules to standalone bootstrap. `retail-banking-portal` runs first (sequential). `corporate-dashboard` and `mobile-api-gateway` run in parallel child Devin sessions.

### Sub-PR Strategy

Split this phase into **one PR per application** to keep reviews manageable and isolate blast radius:

- **PR 3a:** `retail-banking-portal` — runs FIRST, sequential (highest risk — owns SSO auth flow)
- **PR 3b:** `corporate-dashboard` — runs IN PARALLEL with 3c after 3a is merged
- **PR 3c:** `mobile-api-gateway` — runs IN PARALLEL with 3b after 3a is merged

### Phase 3a — `retail-banking-portal` (sequential)

In the current Devin session, complete Phase 3a end-to-end before launching parallel children. The session must apply `angular-standards.md` and replace the class-based `AuthGuard` with a functional guard per `security-policy.md`, preserving `state.url` as `RelayState` and routing all auth through `SsoAuthService` only. Open PR 3a. Wait for merge before Phase 3b/3c.

### Phase 3b + 3c — Parallel Child Sessions (programmatic)

**Use the `managing-child-sessions` skill — do NOT open sessions manually in the webapp.** Programmatic child sessions are reproducible, auditable, and let the parent aggregate results in a single message.

**Pre-flight sanity check.** Before launching, confirm the two apps share no source files and have no cross-dependencies:

```bash
diff <(find apps/corporate-dashboard -type f | sort) \
     <(find apps/mobile-api-gateway -type f | sort) | head
```

Each app's footprint should be its own `package.json`, `package-lock.json`, and `src/` tree — no overlap.

**Launch the two children in one batch** via the `devin_session_create` MCP tool (one call, two specs). Pin both to the same repo, attach this playbook (`!angular-upgrade`), and tag them so the aggregate report can find them:

- **Phase 3b — `corporate-dashboard`:**
  > Phase 3a (`retail-banking-portal`) is merged to `main`. Migrate `apps/corporate-dashboard` from NgModule to standalone components. Apply `angular-standards.md`. `shared-ui` is already on Angular 18. Open PR 3b when complete.

- **Phase 3c — `mobile-api-gateway`:**
  > Phase 3a (`retail-banking-portal`) is merged to `main`. Migrate `apps/mobile-api-gateway` from NgModule to standalone components. Apply `angular-standards.md`. `shared-ui` is already on Angular 18. Open PR 3c when complete.

**Wait for both** with `devin_session_gather` (timeout 600s), then post a single aggregate report on the parent session linking both child sessions and both PRs. Format the report as a table: `Phase | App | PR | Files | Diff | Child Session`.

### Leverage `ng update` Schematics

Before manual changes in each session, run Angular's automatic migration schematics:
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

## Phase 4 — RxJS 6 → 7 Patterns + `shared-data-access` Upgrade

**Objective:** Replace all deprecated RxJS 6 patterns in `shared-data-access` and `dashboard`, and bump `shared-data-access` peer deps from Angular 14 to 18 so the Phase 2 soft-pass falls away.

### Migration Map

| RxJS 6 Pattern | RxJS 7+ Replacement | Files Affected |
|---|---|---|
| `observable.toPromise()` | `lastValueFrom(observable)` | `banking-api.service.ts` |
| `combineLatest([obs1, obs2])` | `combineLatest({ key1: obs1, key2: obs2 })` | `fraud-detection.service.ts`, `dashboard.component.ts` |
| `throwError('string')` | `throwError(() => new Error('string'))` | `sso-auth.service.ts` |

### Steps

1. Bump `libs/shared-data-access/package.json` peers to `@angular/core@^18.0.0`, `@angular/common@^18.0.0`, `rxjs@~7.8.0`. Re-run `validate-downstream.sh` and confirm `shared-data-access` now hits the real build path (no more soft-pass line).

2. Update `rxjs` in all remaining `package.json` files: `"rxjs": "~7.8.0"`.

3. Find and replace `toPromise()`:
   ```typescript
   // Before (RxJS 6)
   return this.http.get<T>(url).toPromise();

   // After (RxJS 7)
   import { lastValueFrom } from 'rxjs';
   return lastValueFrom(this.http.get<T>(url));
   ```
   > ⚠️ Note: `lastValueFrom` throws `EmptyError` on empty observables instead of resolving `undefined` like `toPromise()`. Update any code that depends on the undefined fallback.

4. Find and replace `combineLatest` array syntax:
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

5. Run full test suite after changes to verify no regression in async behavior.

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
