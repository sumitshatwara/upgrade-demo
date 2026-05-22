import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  // Corporate dashboard auth guard — stub for Phase 3b
  // Full SSO integration deferred to when SsoAuthService is shared
  return true;
};
