# Angular 14 → 18 Upgrade Playbook

**Application:** BofA Digital Banking Platform
**Scope:** `retail-banking-portal`, `corporate-dashboard`, `mobile-api-gateway`, `shared-ui`, `shared-data-access`
**Devin Knowledge:** `.devin/knowledge/angular-standards.md`, `security-policy.md`, `test-standards.md`

---

## Phase 1 — Codebase Analysis & Migration Plan

**Objective:** Full dependency and pattern audit. Open migration plan PR.

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

**Objective:** Upgrade the shared component library first to unblock all consumers.

### Steps

1. Update `@bofa/shared-ui/package.json`:
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

> **🛑 GUARDRAIL: All 8 consumer CI checks must pass before proceeding to Phase 3.**
> (3 apps × build + test = 6 checks, plus shared-data-access build and type check = 8 total)
> If any check fails, fix shared-ui and re-run. Do NOT proceed with broken consumers.

---

## Phase 3 — NgModule → Standalone Components

**Objective:** Migrate all app modules to standalone bootstrap. Apply `angular-standards.md`.

### Steps (per application — repeat for all 3 apps)

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

---

## Phase 4 — RxJS 6 → 7 Pattern Updates

**Objective:** Replace all deprecated RxJS 6 patterns with RxJS 7 equivalents.

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

3. Find and replace `combineLatest` array syntax:
   ```typescript
   // Before (RxJS 6)
   combineLatest([signals$, profile$]).pipe(
     map(([signals, profile]) => ...)
   )

   // After (RxJS 7 — preferred object syntax)
   combineLatest({ signals: signals$, profile: profile$ }).pipe(
     map(({ signals, profile }) => ...)
   )
   ```

4. Run full test suite after changes to verify no regression in async behavior.

---

## Phase 5 — Angular Material v14 → v18 API Updates

**Objective:** Fix all breaking Material API changes surfaced during Phase 2.

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

---

## Phase 6 — Jest Migration (Replace Karma/Jasmine)

**Objective:** Replace Karma/Jasmine with Jest per `test-standards.md`. Ensure ≥80% coverage on compliance paths.

### Steps

1. For each application:
   - Follow the Jest migration steps in `test-standards.md` Section 1.
   - Delete `karma.conf.js` and `src/test.ts`.
   - Add `jest.config.ts` and `setup-jest.ts`.

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
