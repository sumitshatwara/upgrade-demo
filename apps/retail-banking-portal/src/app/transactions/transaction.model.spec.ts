import { centsToUsd } from './transaction.model';

describe('Transaction Model — centsToUsd', () => {
  it('should convert positive cents to USD string', () => {
    expect(centsToUsd(12345)).toBe('$123.45');
  });

  it('should convert zero cents', () => {
    expect(centsToUsd(0)).toBe('$0.00');
  });

  it('should handle negative cents', () => {
    const result = centsToUsd(-5000);
    expect(result).toContain('50.00');
  });

  it('should handle null input gracefully', () => {
    expect(centsToUsd(null as any)).toBe('$0.00');
  });

  it('should handle undefined input gracefully', () => {
    expect(centsToUsd(undefined as any)).toBe('$0.00');
  });

  it('should handle NaN input gracefully', () => {
    expect(centsToUsd(NaN)).toBe('$0.00');
  });

  it('should handle very large amounts', () => {
    const result = centsToUsd(999999999);
    expect(result).toContain('9,999,999.99');
  });

  it('should handle single cent', () => {
    expect(centsToUsd(1)).toBe('$0.01');
  });
});
