import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { auditLoggingInterceptor } from './audit-logging.interceptor';
import { SsoAuthService } from '../../auth/sso-auth.service';

describe('auditLoggingInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuthService: Partial<SsoAuthService>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAuthService = {
      getToken: jest.fn().mockReturnValue(null)
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([auditLoggingInterceptor])),
        provideHttpClientTesting(),
        { provide: SsoAuthService, useValue: mockAuthService }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    httpMock.verify();
    consoleSpy.mockRestore();
  });

  it('should add X-Correlation-ID header to requests', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('X-Correlation-ID')).toBe(true);
    expect(req.request.headers.get('X-Correlation-ID')).toMatch(/^cid-/);
    req.flush({});
  });

  it('should add X-Client-App header to requests', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('X-Client-App')).toBe(true);
    req.flush({});
  });

  it('should log audit entry for outgoing requests', () => {
    httpClient.get('/api/accounts').subscribe();

    const req = httpMock.expectOne('/api/accounts');
    req.flush({});

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GET'));
  });

  it('should log audit entry for responses', () => {
    httpClient.get('/api/accounts').subscribe();

    const req = httpMock.expectOne('/api/accounts');
    req.flush({});

    const responseLogs = consoleSpy.mock.calls.filter(
      (call: string[]) => call[0].includes('Response')
    );
    expect(responseLogs.length).toBeGreaterThan(0);
  });

  it('should sanitize URLs with numeric IDs in audit logs', () => {
    httpClient.get('/api/accounts/123456/transactions').subscribe();

    const req = httpMock.expectOne('/api/accounts/123456/transactions');
    req.flush({});

    const auditLog = consoleSpy.mock.calls[0][0];
    expect(auditLog).toContain('/***');
    expect(auditLog).not.toContain('123456');
  });

  it('should use session correlation ID when token is available', () => {
    const mockToken = [
      btoa(JSON.stringify({ alg: 'RS256' })),
      btoa(JSON.stringify({ sessionIndex: 'session-123' })),
      'signature'
    ].join('.');

    (mockAuthService.getToken as jest.Mock).mockReturnValue(mockToken);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-Correlation-ID')).toBe('session-123');
    req.flush({});
  });

  it('should generate correlation ID when no token is available', () => {
    (mockAuthService.getToken as jest.Mock).mockReturnValue(null);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    const cid = req.request.headers.get('X-Correlation-ID');
    expect(cid).toMatch(/^cid-/);
    req.flush({});
  });
});
