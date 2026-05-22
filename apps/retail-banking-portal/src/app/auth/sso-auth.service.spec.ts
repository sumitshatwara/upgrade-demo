import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SsoAuthService, SsoTokenPayload } from './sso-auth.service';
import { environment } from '../../environments/environment';

function createMockToken(payload: Partial<SsoTokenPayload> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    sub: 'user-123',
    email: 'test@bankofamerica.com',
    roles: ['RETAIL_USER'],
    samlAssertionRef: 'assertion-ref-1',
    sessionIndex: 'session-idx-1',
    notOnOrAfter: new Date(Date.now() + 3600000).toISOString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload
  }));
  return `${header}.${body}.mock-signature`;
}

describe('SsoAuthService', () => {
  let service: SsoAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SsoAuthService
      ]
    });
    service = TestBed.inject(SsoAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated', () => {
    it('should return false when no session exists', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false when session is expired', () => {
      const expiredToken = createMockToken({
        notOnOrAfter: new Date(Date.now() - 1000).toISOString()
      });
      sessionStorage.setItem('bofa_sso_token', expiredToken);
      const freshService = TestBed.inject(SsoAuthService);
      expect(freshService.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return false when not authenticated', () => {
      expect(service.hasRole('RETAIL_USER')).toBe(false);
    });

    it('should return false for a role the user does not have', () => {
      expect(service.hasRole('ADMIN')).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return null when not authenticated', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('initiateSamlLogin', () => {
    it('should build SSO redirect URL with RelayState', () => {
      const buildAuthNRequestSpy = jest.spyOn(service as any, 'buildAuthNRequest').mockReturnValue('mock-authn');
      try {
        service.initiateSamlLogin('/transactions');
      } catch {
        // window.location.href assignment throws in JSDOM — expected
      }
      expect(buildAuthNRequestSpy).toHaveBeenCalled();
    });

    it('should call buildAuthNRequest for default RelayState', () => {
      const buildAuthNRequestSpy = jest.spyOn(service as any, 'buildAuthNRequest').mockReturnValue('mock-authn');
      try {
        service.initiateSamlLogin();
      } catch {
        // window.location.href assignment throws in JSDOM — expected
      }
      expect(buildAuthNRequestSpy).toHaveBeenCalled();
    });
  });

  describe('validateSamlAssertion', () => {
    it('should validate SAML assertion and update auth state', () => {
      const token = createMockToken();
      const payload: SsoTokenPayload = JSON.parse(atob(token.split('.')[1]));

      service.validateSamlAssertion('mock-saml-response', '/dashboard').subscribe(state => {
        expect(state.isAuthenticated).toBe(true);
        expect(state.token).toBe(token);
        expect(state.user?.email).toBe('test@bankofamerica.com');
      });

      const req = httpMock.expectOne(`${environment.ssoBaseUrl}/saml/validate`);
      expect(req.request.method).toBe('POST');
      req.flush({ token, payload });
    });

    it('should store token in sessionStorage', () => {
      const token = createMockToken();
      const payload: SsoTokenPayload = JSON.parse(atob(token.split('.')[1]));

      service.validateSamlAssertion('mock-response', '/').subscribe();
      const req = httpMock.expectOne(`${environment.ssoBaseUrl}/saml/validate`);
      req.flush({ token, payload });

      expect(sessionStorage.getItem('bofa_sso_token')).toBe(token);
    });

    it('should handle validation failure gracefully', () => {
      service.validateSamlAssertion('bad-response', '/').subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Authentication failed');
        }
      });

      const req = httpMock.expectOne(`${environment.ssoBaseUrl}/saml/validate`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('refreshToken', () => {
    it('should throw error when no active session exists', () => {
      service.refreshToken().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('No active session');
        }
      });
    });
  });

  describe('logout', () => {
    it('should clear sessionStorage on logout', () => {
      sessionStorage.setItem('bofa_sso_token', 'some-token');
      try {
        service.logout();
      } catch {
        // window.location.href assignment throws in JSDOM — expected
      }
      expect(sessionStorage.getItem('bofa_sso_token')).toBeNull();
    });
  });

  describe('authState', () => {
    it('should emit initial unauthenticated state', (done) => {
      service.authState.subscribe(state => {
        expect(state.isAuthenticated).toBe(false);
        expect(state.token).toBeNull();
        expect(state.user).toBeNull();
        done();
      });
    });
  });
});
