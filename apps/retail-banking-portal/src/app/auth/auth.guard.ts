import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { SsoAuthService } from './sso-auth.service';

/**
 * Route guard for BofA Retail Banking Portal.
 *
 * SECURITY POLICY (security-policy.md):
 *   - SSO token chain must be preserved across all auth guard migrations.
 *   - No external auth calls outside sso-auth.service.
 *   - CanActivate interface MUST be migrated to functional guards (Phase 3).
 *
 * MIGRATION TARGET (Devin — Phase 3):
 *   Replace this class-based CanActivate guard with a functional guard:
 *
 *   // New functional guard pattern (Angular 15+)
 *   export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
 *     const authService = inject(SsoAuthService);
 *     const router = inject(Router);
 *     if (authService.isAuthenticated()) {
 *       const requiredRole = route.data?.['requiresRole'];
 *       if (requiredRole && !authService.hasRole(requiredRole)) {
 *         return router.createUrlTree(['/unauthorized']);
 *       }
 *       return true;
 *     }
 *     authService.initiateSamlLogin(state.url);
 *     return false;
 *   };
 *
 *   Then update app-routing.module.ts (or app.routes.ts post-migration):
 *   canActivate: [authGuard]
 *
 * DEPRECATED: The CanActivate interface is deprecated as of Angular 15.
 *   This class-based guard is kept for Angular 14 baseline only.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  // MIGRATION TARGET: Replace constructor injection with inject()
  constructor(
    private authService: SsoAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (!this.authService.isAuthenticated()) {
      // Preserve return URL as RelayState for SAML round-trip
      this.authService.initiateSamlLogin(state.url);
      return false;
    }

    // Role-based access control
    const requiredRole: string | undefined = route.data?.['requiresRole'];
    if (requiredRole && !this.authService.hasRole(requiredRole)) {
      return this.router.createUrlTree(['/unauthorized'], {
        queryParams: { returnUrl: state.url }
      });
    }

    return true;
  }
}
