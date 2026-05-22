import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { SsoAuthService } from './sso-auth.service';

describe('authGuard', () => {
  let mockAuthService: jest.Mocked<Partial<SsoAuthService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: jest.fn(),
      hasRole: jest.fn(),
      initiateSamlLogin: jest.fn()
    };

    mockRouter = {
      createUrlTree: jest.fn().mockReturnValue('/unauthorized')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SsoAuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  function runGuard(routeData: Record<string, unknown> = {}, stateUrl = '/dashboard'): boolean | any {
    const route = { data: routeData } as unknown as ActivatedRouteSnapshot;
    const state = { url: stateUrl } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  }

  it('should allow access when user is authenticated', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(true);
    expect(runGuard()).toBe(true);
  });

  it('should redirect to SAML login when not authenticated', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(false);
    const result = runGuard({}, '/transactions');
    expect(result).toBe(false);
    expect(mockAuthService.initiateSamlLogin).toHaveBeenCalledWith('/transactions');
  });

  it('should preserve state.url as RelayState in SAML login', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(false);
    runGuard({}, '/accounts/12345');
    expect(mockAuthService.initiateSamlLogin).toHaveBeenCalledWith('/accounts/12345');
  });

  it('should redirect to /unauthorized when user lacks required role', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(true);
    mockAuthService.hasRole!.mockReturnValue(false);
    const result = runGuard({ requiresRole: 'ADMIN' }, '/admin');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should allow access when user has the required role', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(true);
    mockAuthService.hasRole!.mockReturnValue(true);
    expect(runGuard({ requiresRole: 'RETAIL_USER' })).toBe(true);
  });

  it('should not check roles when no requiresRole is set', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(true);
    expect(runGuard()).toBe(true);
    expect(mockAuthService.hasRole).not.toHaveBeenCalled();
  });

  it('should not make external auth calls — delegates to SsoAuthService only', () => {
    mockAuthService.isAuthenticated!.mockReturnValue(false);
    runGuard({}, '/test');
    expect(mockAuthService.initiateSamlLogin).toHaveBeenCalled();
  });
});
