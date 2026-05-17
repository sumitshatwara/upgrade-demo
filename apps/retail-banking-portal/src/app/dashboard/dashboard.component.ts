import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BankingApiService, AccountSummary } from '@bofa/shared-data-access';
import { AnalyticsService } from '../analytics/analytics.service';
import { SsoAuthService } from '../auth/sso-auth.service';

export interface DashboardViewModel {
  accounts: AccountSummary[];
  totalBalance: number;
  pendingTransactions: number;
  spendingScore: number;
  alertCount: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Retail Banking Dashboard — primary landing screen after SSO.
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   1. Add standalone: true — remove from app.module.ts declarations.
 *   2. Replace constructor injection with inject() per angular-standards.md.
 *   3. ViewChild static flag usage below is deprecated — remove static: true
 *      unless element is accessed in ngOnInit (pre-view-init lifecycle).
 *   4. Consider migrating to Signals-based reactivity (Angular 16+).
 */
@Component({
  selector: 'bofa-dashboard',
  templateUrl: './dashboard.component.html',
  // OnPush requires explicit markForCheck() calls when data changes outside
  // Angular's detection zone (e.g., WebSocket pushes, SSO token refresh).
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

  /**
   * @deprecated `static: true` was required pre-Angular 9 for ViewChild.
   * In Angular 9+ the default is static: false (resolved after view init).
   * Remove `{ static: true }` unless the element must be accessed in ngOnInit
   * before the view is fully initialized.
   *
   * MIGRATION TARGET: Remove static flag → @ViewChild('balanceSummaryPanel')
   */
  @ViewChild('balanceSummaryPanel', { static: true })
  balanceSummaryPanel!: ElementRef<HTMLDivElement>;

  @ViewChild('chartCanvas', { static: true })
  chartCanvas!: ElementRef<HTMLCanvasElement>;

  viewModel: DashboardViewModel = {
    accounts: [],
    totalBalance: 0,
    pendingTransactions: 0,
    spendingScore: 0,
    alertCount: 0,
    isLoading: true,
    error: null
  };

  private destroy$ = new Subject<void>();

  // MIGRATION TARGET: Replace constructor injection with inject()
  constructor(
    private bankingApi: BankingApiService,
    private analyticsService: AnalyticsService,
    private authService: SsoAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToRealTimeAlerts();
  }

  private loadDashboardData(): void {
    // RxJS 6 combineLatest array syntax
    // MIGRATION TARGET (Phase 4): combineLatest({ accounts: ..., score: ... })
    combineLatest([
      this.bankingApi.getAccountSummaries(),
      this.analyticsService.getSpendingScore()
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([accounts, spendingScore]) => {
          const totalBalance = accounts.reduce((sum, acc) => sum + acc.availableBalance, 0);
          const pendingTransactions = accounts.reduce((sum, acc) => sum + acc.pendingCount, 0);

          this.viewModel = {
            accounts,
            totalBalance,
            pendingTransactions,
            spendingScore,
            alertCount: this.viewModel.alertCount,
            isLoading: false,
            error: null
          };

          // Required with OnPush — data arrives via service (outside zone)
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.viewModel = {
            ...this.viewModel,
            isLoading: false,
            error: 'Failed to load account data. Please refresh.'
          };
          this.cdr.markForCheck();
        }
      });
  }

  private subscribeToRealTimeAlerts(): void {
    this.bankingApi.getAlertStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alertCount => {
        this.viewModel = { ...this.viewModel, alertCount };
        // markForCheck required — WebSocket events bypass Angular zone
        this.cdr.markForCheck();
      });
  }

  trackByAccountId(index: number, account: AccountSummary): string {
    return account.accountId;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
