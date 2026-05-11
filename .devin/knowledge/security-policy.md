# BofA Digital Banking — Security Policy

**Classification:** Internal — Engineering Confidential
**Version:** 3.0.0
**Owner:** BofA Platform Security Team

---

## 1. HTTP Interceptor Requirements

**ALL HTTP interceptors must include audit logging.**

Every outbound HTTP request from Angular applications must pass through
`AuditLoggingInterceptor`. This interceptor must:

- Log the HTTP method, sanitized URL (no PII in path), and timestamp.
- Attach the correlation ID from the SSO token to every request.
- Record response status codes for compliance monitoring.
- Never log request/response bodies unless explicitly approved by Security Review.

```typescript
// Required interceptor signature (functional form post-migration):
export const auditLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(SsoAuthService);
  const correlationId = authService.getToken()
    ? extractCorrelationId(authService.getToken()!)
    : generateCorrelationId();

  const auditedReq = req.clone({
    headers: req.headers
      .set('X-Correlation-ID', correlationId)
      .set('X-Client-App', environment.appName)
  });

  console.info(`[AUDIT] ${req.method} ${sanitizeUrl(req.url)} — CID: ${correlationId}`);
  return next(auditedReq);
};
```

---

## 2. SSO Token Chain Preservation

**The SSO token chain MUST be preserved across all auth guard migrations.**

When migrating from class-based `CanActivate` guards to functional guards:

- The functional guard MUST call `inject(SsoAuthService).isAuthenticated()`.
- It MUST NOT bypass the SSO service or call any external auth endpoint directly.
- The `RelayState` (return URL) passed to `initiateSamlLogin()` must be preserved.
- Token refresh logic in `SsoAuthService.refreshToken()` must remain intact.

**No External Auth Calls:**
No Angular service, component, or guard may make HTTP calls to authentication
endpoints outside of `SsoAuthService`. All auth operations are encapsulated there.

---

## 3. CanActivate Migration to Functional Guards

The class-based `CanActivate` interface is deprecated as of Angular 15.
Migration to functional guards is required as part of Phase 3.

**REQUIRED migration pattern:**

```typescript
// ✅ CORRECT — functional guard preserving SSO chain
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SsoAuthService } from '../auth/sso-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(SsoAuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    // Preserve RelayState for SAML round-trip — DO NOT REMOVE
    authService.initiateSamlLogin(state.url);
    return false;
  }

  const requiredRole: string | undefined = route.data?.['requiresRole'];
  if (requiredRole && !authService.hasRole(requiredRole)) {
    return router.createUrlTree(['/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
  }

  return true;
};
```

---

## 4. PII Handling

- Transaction data (amounts, merchant names, account numbers) is PII-adjacent.
- Components accessing PII fields must set `requiresAuditLog: true` on the model.
- Never log raw transaction objects to the browser console in production builds.
- Audit log entries must be forwarded to the BofA SIEM within 500ms of the event.

---

## 5. Compliance Path Test Coverage

Per `test-standards.md`, the following code paths require a minimum of 80% test coverage:

- `SsoAuthService` — all public methods
- `AuthGuard` / `authGuard` functional guard
- `TransactionListComponent` — filter, sort, and pagination paths
- `FraudDetectionService` — all risk assessment logic
- `BankingApiService` — all methods including error paths
