import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FraudDetectionService, FraudSignal, BehavioralProfile } from './fraud-detection.service';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let httpMock: HttpTestingController;
  const FRAUD_API = 'https://api.bankofamerica.internal/v2/fraud';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FraudDetectionService
      ]
    });
    service = TestBed.inject(FraudDetectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('assessTransactionRisk', () => {
    const mockSignals: FraudSignal[] = [{
      signalType: 'VELOCITY',
      severity: 'medium',
      score: 45,
      description: 'Unusual transaction frequency',
      transactionId: 'txn-1',
      detectedAt: '2024-01-15T10:00:00Z'
    }];

    const mockProfile: BehavioralProfile = {
      customerId: 'cust-1',
      typicalMerchantCategories: ['GROCERY', 'DINING'],
      typicalTransactionAmountCents: 5000,
      typicalGeoRegions: ['US-CA'],
      lastUpdated: '2024-01-10T00:00:00Z'
    };

    it('should combine signals and profile to assess risk', () => {
      service.assessTransactionRisk('txn-1', 'cust-1').subscribe(assessment => {
        expect(assessment.transactionId).toBe('txn-1');
        expect(assessment.overallRiskScore).toBe(45);
        expect(assessment.riskLevel).toBe('medium');
        expect(assessment.recommendation).toBe('REVIEW');
      });

      const signalReq = httpMock.expectOne(`${FRAUD_API}/signals/txn-1`);
      const profileReq = httpMock.expectOne(`${FRAUD_API}/profile/cust-1`);
      signalReq.flush(mockSignals);
      profileReq.flush(mockProfile);
    });

    it('should return DECLINE for critical severity signals', () => {
      const criticalSignals: FraudSignal[] = [{
        signalType: 'GEO_ANOMALY',
        severity: 'critical',
        score: 95,
        description: 'Transaction from unusual country',
        transactionId: 'txn-2',
        detectedAt: '2024-01-15T10:00:00Z'
      }];

      service.assessTransactionRisk('txn-2', 'cust-1').subscribe(assessment => {
        expect(assessment.riskLevel).toBe('critical');
        expect(assessment.recommendation).toBe('DECLINE');
        expect(assessment.requiresManualReview).toBe(true);
      });

      httpMock.expectOne(`${FRAUD_API}/signals/txn-2`).flush(criticalSignals);
      httpMock.expectOne(`${FRAUD_API}/profile/cust-1`).flush(mockProfile);
    });

    it('should return APPROVE for low risk transactions', () => {
      const lowSignals: FraudSignal[] = [{
        signalType: 'VELOCITY',
        severity: 'low',
        score: 10,
        description: 'Normal pattern',
        transactionId: 'txn-3',
        detectedAt: '2024-01-15T10:00:00Z'
      }];

      service.assessTransactionRisk('txn-3', 'cust-1').subscribe(assessment => {
        expect(assessment.riskLevel).toBe('low');
        expect(assessment.recommendation).toBe('APPROVE');
        expect(assessment.requiresManualReview).toBe(false);
      });

      httpMock.expectOne(`${FRAUD_API}/signals/txn-3`).flush(lowSignals);
      httpMock.expectOne(`${FRAUD_API}/profile/cust-1`).flush(mockProfile);
    });

    it('should handle empty signals array', () => {
      service.assessTransactionRisk('txn-4', 'cust-1').subscribe(assessment => {
        expect(assessment.overallRiskScore).toBe(0);
        expect(assessment.riskLevel).toBe('low');
        expect(assessment.recommendation).toBe('APPROVE');
      });

      httpMock.expectOne(`${FRAUD_API}/signals/txn-4`).flush([]);
      httpMock.expectOne(`${FRAUD_API}/profile/cust-1`).flush(mockProfile);
    });

    it('should return STEP_UP_AUTH for high-score but not critical', () => {
      const highSignals: FraudSignal[] = [{
        signalType: 'AMOUNT_SPIKE',
        severity: 'high',
        score: 75,
        description: 'Amount exceeds typical range',
        transactionId: 'txn-5',
        detectedAt: '2024-01-15T10:00:00Z'
      }];

      service.assessTransactionRisk('txn-5', 'cust-1').subscribe(assessment => {
        expect(assessment.recommendation).toBe('STEP_UP_AUTH');
        expect(assessment.requiresManualReview).toBe(true);
      });

      httpMock.expectOne(`${FRAUD_API}/signals/txn-5`).flush(highSignals);
      httpMock.expectOne(`${FRAUD_API}/profile/cust-1`).flush(mockProfile);
    });
  });

  describe('monitorTransactionBatch', () => {
    it('should monitor multiple transactions simultaneously', () => {
      service.monitorTransactionBatch(['txn-1', 'txn-2']).subscribe(results => {
        expect(results.length).toBe(2);
      });

      httpMock.expectOne(`${FRAUD_API}/signals/txn-1`).flush([]);
      httpMock.expectOne(`${FRAUD_API}/signals/txn-2`).flush([]);
    });
  });

  describe('reportFalsePositive', () => {
    it('should post false positive report', () => {
      service.reportFalsePositive('txn-1', 'Not fraud').subscribe();

      const req = httpMock.expectOne(`${FRAUD_API}/false-positive`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.transactionId).toBe('txn-1');
      expect(req.request.body.reason).toBe('Not fraud');
      expect(req.request.body.reportedAt).toBeDefined();
      req.flush(null);
    });
  });
});
