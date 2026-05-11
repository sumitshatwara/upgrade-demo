import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FraudSignal {
  signalType: 'VELOCITY' | 'GEO_ANOMALY' | 'DEVICE_MISMATCH' | 'AMOUNT_SPIKE' | 'MERCHANT_MISMATCH';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  transactionId: string;
  detectedAt: string;
}

export interface BehavioralProfile {
  customerId: string;
  typicalMerchantCategories: string[];
  typicalTransactionAmountCents: number;
  typicalGeoRegions: string[];
  lastUpdated: string;
}

export interface FraudRiskAssessment {
  transactionId: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: FraudSignal[];
  recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'STEP_UP_AUTH';
  requiresManualReview: boolean;
}

/**
 * BofA Fraud Detection Service — real-time transaction risk assessment.
 *
 * ─────────────────────────────────────────────────────────────────────
 * RxJS 6.x combineLatest ARRAY SYNTAX (current — migration target):
 *
 *   combineLatest([obs1, obs2]) — ARRAY syntax (RxJS 6)
 *
 *   MIGRATION TARGET (Phase 4):
 *   Replace with OBJECT syntax (RxJS 7+):
 *     combineLatest({ signals: obs1, profile: obs2 })
 *
 *   Benefits of object syntax:
 *   - Destructuring is clearer: ({ signals, profile }) => ...
 *   - No positional index coupling — safe to add/remove sources
 *   - Aligns with RxJS 7 best practices
 *
 *   Array syntax still works in RxJS 7 but is considered legacy.
 * ─────────────────────────────────────────────────────────────────────
 *
 * MIGRATION NOTE (Devin — Phase 3):
 *   Constructor injection → inject(HttpClient).
 */
@Injectable({
  providedIn: 'root'
})
export class FraudDetectionService {
  private readonly FRAUD_API = 'https://api.bankofamerica.internal/v2/fraud';

  // MIGRATION TARGET: private http = inject(HttpClient);
  constructor(private http: HttpClient) {}

  /**
   * Assesses fraud risk by combining real-time signals with
   * the customer's behavioral profile.
   *
   * RxJS 6.x combineLatest ARRAY SYNTAX — MIGRATION TARGET (Phase 4).
   * Replace with: combineLatest({ signals: signals$, profile: profile$ })
   */
  assessTransactionRisk(transactionId: string, customerId: string): Observable<FraudRiskAssessment> {
    const signals$ = this.http.get<FraudSignal[]>(
      `${this.FRAUD_API}/signals/${transactionId}`
    );
    const profile$ = this.http.get<BehavioralProfile>(
      `${this.FRAUD_API}/profile/${customerId}`
    );

    // RxJS 6 array syntax — MIGRATION TARGET
    // Replace with: combineLatest({ signals: signals$, profile: profile$ })
    return combineLatest([signals$, profile$]).pipe(
      map(([signals, profile]) => this.buildRiskAssessment(transactionId, signals, profile))
    );
  }

  /**
   * Monitors multiple transactions simultaneously.
   * Uses combineLatest array syntax — see migration note above.
   *
   * MIGRATION TARGET (Phase 4): Use object syntax with dynamic keys.
   */
  monitorTransactionBatch(transactionIds: string[]): Observable<FraudSignal[][]> {
    const signalObservables = transactionIds.map(id =>
      this.http.get<FraudSignal[]>(`${this.FRAUD_API}/signals/${id}`)
    );

    // RxJS 6.x combineLatest array syntax — MIGRATION TARGET
    return combineLatest(signalObservables);
  }

  reportFalsePositive(transactionId: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.FRAUD_API}/false-positive`, {
      transactionId,
      reason,
      reportedAt: new Date().toISOString()
    });
  }

  private buildRiskAssessment(
    transactionId: string,
    signals: FraudSignal[],
    profile: BehavioralProfile
  ): FraudRiskAssessment {
    const overallRiskScore = signals.reduce((acc, s) => acc + s.score, 0) / Math.max(signals.length, 1);
    const maxSeverity = this.getMaxSeverity(signals);
    return {
      transactionId,
      overallRiskScore,
      riskLevel: maxSeverity,
      signals,
      recommendation: this.getRecommendation(overallRiskScore, maxSeverity),
      requiresManualReview: overallRiskScore > 75 || maxSeverity === 'critical'
    };
  }

  private getMaxSeverity(signals: FraudSignal[]): 'low' | 'medium' | 'high' | 'critical' {
    if (signals.some(s => s.severity === 'critical')) return 'critical';
    if (signals.some(s => s.severity === 'high')) return 'high';
    if (signals.some(s => s.severity === 'medium')) return 'medium';
    return 'low';
  }

  private getRecommendation(score: number, severity: string): 'APPROVE' | 'REVIEW' | 'DECLINE' | 'STEP_UP_AUTH' {
    if (severity === 'critical' || score > 90) return 'DECLINE';
    if (score > 70) return 'STEP_UP_AUTH';
    if (score > 40) return 'REVIEW';
    return 'APPROVE';
  }
}
