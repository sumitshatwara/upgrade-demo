# BofA Angular Engineering Standards

**Version:** 2.1.0
**Effective Date:** 2024-01-01
**Applies To:** All Angular applications within the BofA Digital Banking platform.

---

## Core Mandate

**BofA Angular Standard: All components targeting Angular 17+ MUST use the standalone component pattern.**

No new code may use NgModule declarations. All migration work must preserve
functional equivalence and comply with the security policies in `security-policy.md`.

---

## Component Authoring Standards

### 1. Standalone Components (REQUIRED for Angular 17+)

All new components must be declared as standalone:

```typescript
@Component({
  selector: 'bofa-example',
  standalone: true,            // ← REQUIRED
  imports: [CommonModule, MatButtonModule],
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {}
```

**Do NOT** declare components inside an `@NgModule` declarations array in new code.

### 2. Dependency Injection — inject() Function (REQUIRED)

Use `inject()` instead of constructor injection for all new and migrated services:

```typescript
// ✅ CORRECT — BofA Standard
import { inject } from '@angular/core';

@Component({ standalone: true, ... })
export class MyComponent {
  private http = inject(HttpClient);
  private authService = inject(SsoAuthService);
  private router = inject(Router);
}

// ❌ FORBIDDEN in new/migrated code
@Component({})
export class MyComponent {
  constructor(private http: HttpClient) {}  // Constructor injection deprecated
}
```

### 3. HTTP Client — provideHttpClient() (REQUIRED)

Do **NOT** import `HttpClientModule` in new code.

```typescript
// ✅ CORRECT — app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([auditLoggingInterceptor])
    )
  ]
};

// ❌ FORBIDDEN in new/migrated code
@NgModule({
  imports: [HttpClientModule]  // Deprecated — do not use
})
```

### 4. No NgModule Declarations in New Code

Bootstrap with `bootstrapApplication()`, not `bootstrapModule()`:

```typescript
// ✅ CORRECT — main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

### 5. Router — provideRouter() (REQUIRED)

```typescript
// ✅ CORRECT — app.config.ts
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' }))
  ]
};
```

---

## Control Flow Syntax (Angular 17+)

Use the new built-in control flow syntax instead of structural directives:

```html
<!-- ✅ Angular 17+ -->
@if (user.isAuthenticated) {
  <bofa-dashboard />
} @else {
  <bofa-login />
}

@for (account of accounts; track account.accountId) {
  <bofa-account-card [account]="account" />
}

<!-- ❌ Legacy — do not use in new code -->
<div *ngIf="user.isAuthenticated">
<div *ngFor="let account of accounts; trackBy: trackByAccountId">
```

---

## Signals (Angular 16+)

Prefer Angular Signals over BehaviorSubject for local component state:

```typescript
// ✅ Preferred for local state
import { signal, computed } from '@angular/core';

export class DashboardComponent {
  accounts = signal<AccountSummary[]>([]);
  totalBalance = computed(() =>
    this.accounts().reduce((sum, a) => sum + a.availableBalance, 0)
  );
}
```

---

## Enforcement

Devin sessions must reference this document (via `.devin/knowledge/`) before
generating any Angular component or service. Violations will cause PR review failure.
