/**
 * BofA Transaction Domain Models
 *
 * NOTE: These models contain PII-adjacent fields (merchant, amount, category).
 * Per test-standards.md: minimum 80% coverage required on transaction code paths.
 * Edge case tests required for null, empty, and malformed input per compliance policy.
 */

export type TransactionStatus = 'PENDING' | 'POSTED' | 'REVERSED' | 'DECLINED' | 'PROCESSING';
export type TransactionType = 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'PAYMENT' | 'ATM_WITHDRAWAL' | 'FEE';
export type TransactionCategory =
  | 'DINING'
  | 'GROCERIES'
  | 'TRAVEL'
  | 'SHOPPING'
  | 'UTILITIES'
  | 'HEALTHCARE'
  | 'ENTERTAINMENT'
  | 'TRANSFERS'
  | 'FEES'
  | 'UNCATEGORIZED';

export interface Transaction {
  /** Internal BofA transaction ID — UUID v4 */
  transactionId: string;

  /** Account the transaction belongs to */
  accountId: string;

  /** ISO 8601 timestamp of transaction authorization */
  transactionDate: string;

  /** ISO 8601 timestamp when transaction posted to account */
  postedDate: string | null;

  /** Transaction amount in USD cents (avoid floating point precision issues) */
  amountCents: number;

  /** Debit (negative) or Credit (positive) from account perspective */
  type: TransactionType;

  status: TransactionStatus;

  /** Merchant display name — may be null for internal transfers */
  merchantName: string | null;

  /** Merchant Category Code (MCC) */
  merchantMcc: string | null;

  /** Normalized spend category derived from MCC */
  category: TransactionCategory;

  /** Optional user-supplied memo */
  memo: string | null;

  /** Whether this transaction was flagged by the fraud detection system */
  isFraudFlagged: boolean;

  /** Reference to related fraud case if isFraudFlagged is true */
  fraudCaseId: string | null;

  /** Running account balance after this transaction (cents) */
  runningBalanceCents: number | null;

  /** Whether this transaction involves PII export — triggers audit log */
  requiresAuditLog: boolean;
}

export interface TransactionFilter {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  categories?: TransactionCategory[];
  statuses?: TransactionStatus[];
  minAmountCents?: number;
  maxAmountCents?: number;
  isFraudFlagged?: boolean;
  searchText?: string;
}

export interface TransactionPage {
  transactions: Transaction[];
  totalCount: number;
  pageSize: number;
  pageIndex: number;
  hasMore: boolean;
  nextPageToken: string | null;
}

/**
 * Utility: convert cents to USD display string.
 * Used in templates where the currency pipe is not available.
 */
export function centsToUsd(cents: number): string {
  if (cents == null || isNaN(cents)) return '$0.00';
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });
}
