import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BankingApiService, AccountSummary, TransactionFilter } from './banking-api.service';

describe('BankingApiService', () => {
  let service: BankingApiService;
  let httpMock: HttpTestingController;
  const BASE_URL = 'https://api.bankofamerica.internal/v2/retail';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BankingApiService
      ]
    });
    service = TestBed.inject(BankingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAccountSummaries', () => {
    it('should fetch account summaries via GET', () => {
      const mockAccounts: AccountSummary[] = [{
        accountId: 'acc-1',
        accountName: 'Checking',
        accountNumber: '****1234',
        accountType: 'CHECKING',
        availableBalance: 5000,
        currentBalance: 5200,
        pendingCount: 2,
        isPrimary: true,
        currencyCode: 'USD',
        lastActivityDate: '2024-01-15'
      }];

      service.getAccountSummaries().subscribe(accounts => {
        expect(accounts).toEqual(mockAccounts);
        expect(accounts.length).toBe(1);
      });

      const req = httpMock.expectOne(`${BASE_URL}/accounts/summary`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAccounts);
    });

    it('should handle empty account list', () => {
      service.getAccountSummaries().subscribe(accounts => {
        expect(accounts).toEqual([]);
      });

      const req = httpMock.expectOne(`${BASE_URL}/accounts/summary`);
      req.flush([]);
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions with filter params', () => {
      const filter: TransactionFilter = {
        accountId: 'acc-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        searchText: 'grocery'
      };

      service.getTransactions(filter).subscribe(page => {
        expect(page.transactions.length).toBe(0);
      });

      const req = httpMock.expectOne(r =>
        r.url === `${BASE_URL}/transactions` &&
        r.params.get('accountId') === 'acc-1' &&
        r.params.get('startDate') === '2024-01-01' &&
        r.params.get('q') === 'grocery'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ transactions: [], totalCount: 0, pageSize: 25, pageIndex: 0, hasMore: false, nextPageToken: null });
    });

    it('should handle empty filter gracefully', () => {
      const filter: TransactionFilter = {};

      service.getTransactions(filter).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/transactions`);
      expect(req.request.method).toBe('GET');
      req.flush({ transactions: [], totalCount: 0, pageSize: 25, pageIndex: 0, hasMore: false, nextPageToken: null });
    });

    it('should handle null-like filter values', () => {
      const filter = { accountId: undefined, startDate: undefined } as TransactionFilter;

      service.getTransactions(filter).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/transactions`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush({ transactions: [], totalCount: 0, pageSize: 25, pageIndex: 0, hasMore: false, nextPageToken: null });
    });
  });

  describe('getAccountSummarySnapshot', () => {
    it('should return accounts as a Promise via lastValueFrom', async () => {
      const mockAccounts: AccountSummary[] = [{
        accountId: 'acc-1',
        accountName: 'Savings',
        accountNumber: '****5678',
        accountType: 'SAVINGS',
        availableBalance: 10000,
        currentBalance: 10000,
        pendingCount: 0,
        isPrimary: false,
        currencyCode: 'USD',
        lastActivityDate: '2024-01-10'
      }];

      const promise = service.getAccountSummarySnapshot();

      const req = httpMock.expectOne(`${BASE_URL}/accounts/summary`);
      req.flush(mockAccounts);

      const result = await promise;
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('getAlertStream', () => {
    it('should return an observable for alerts', () => {
      const alerts: number[] = [];
      service.getAlertStream().subscribe(count => alerts.push(count));

      service.pushAlert(3);
      service.pushAlert(5);

      expect(alerts).toEqual([3, 5]);
    });
  });
});
