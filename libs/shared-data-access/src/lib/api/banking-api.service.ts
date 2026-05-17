import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, lastValueFrom } from 'rxjs';

export interface AccountSummary {
  accountId: string;
  accountName: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'MORTGAGE';
  availableBalance: number;
  currentBalance: number;
  pendingCount: number;
  isPrimary: boolean;
  currencyCode: string;
  lastActivityDate: string;
}

export interface TransactionFilter {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  pageSize?: number;
  pageIndex?: number;
}

export interface TransactionPage {
  transactions: any[];
  totalCount: number;
  pageSize: number;
  pageIndex: number;
  hasMore: boolean;
  nextPageToken: string | null;
}

/**
 * BofA Banking API Service — central HTTP client for all banking data.
 *
 * ─────────────────────────────────────────────────────────────────────
 * RxJS 6.x PATTERNS (current — migration targets below):
 *
 *   1. toPromise() — used in getAccountSummarySnapshot().
 *      MIGRATION TARGET (Phase 4): Replace with lastValueFrom():
 *        import { lastValueFrom } from 'rxjs';
 *        return lastValueFrom(this.http.get<AccountSummary[]>(...));
 *
 *   toPromise() was deprecated in RxJS 7 and removed in RxJS 8.
 *   It resolves with the LAST emitted value, same as lastValueFrom().
 * ─────────────────────────────────────────────────────────────────────
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   Constructor injection → inject(HttpClient) per angular-standards.md.
 */
@Injectable({
  providedIn: 'root'
})
export class BankingApiService {
  private readonly BASE_URL = 'https://api.bankofamerica.internal/v2/retail';
  private alertSubject$ = new Subject<number>();
  private http = inject(HttpClient);

  getAccountSummaries(): Observable<AccountSummary[]> {
    return this.http.get<AccountSummary[]>(`${this.BASE_URL}/accounts/summary`);
  }

  getTransactions(filter: TransactionFilter): Observable<TransactionPage> {
    let params = new HttpParams();
    if (filter.accountId) params = params.set('accountId', filter.accountId);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.searchText) params = params.set('q', filter.searchText);

    return this.http.get<TransactionPage>(`${this.BASE_URL}/transactions`, { params });
  }

  getAccountSummarySnapshot(): Promise<AccountSummary[]> {
    return lastValueFrom(
      this.http.get<AccountSummary[]>(`${this.BASE_URL}/accounts/summary`)
    );
  }

  getAlertStream(): Observable<number> {
    return this.alertSubject$.asObservable();
  }

  pushAlert(count: number): void {
    this.alertSubject$.next(count);
  }
}
