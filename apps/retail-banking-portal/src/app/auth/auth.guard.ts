import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { SsoAuthService } from './sso-auth.service';

/**
 * Functional route guard for BofA Retail Banking Portal.
 *
 * SECURITY POLICY (security-policy.md):
 *   - SSO token chain preserved across auth guard migration.
 *   - No external auth calls outside sso-auth.service.
 *   - state.url preserved as RelayState in initiateSamlLogin().
 */
export const authGuard = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const authService = inject(SsoAuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
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
