import { describe, test, expect } from '@jest/globals';
import { formatCurrency } from '../../../src/utils/planUtils.js';

describe('formatCurrency', () => {
  test('should format USD correctly', () => {
    const formatted = formatCurrency(1234.56, 'USD');
    expect(formatted).toBe('$1,235');
  });

  test('should format EUR correctly', () => {
    const formatted = formatCurrency(1234.56, 'EUR');
    expect(formatted).toBe('€1,235');
  });

  test('should format TRY correctly', () => {
    const formatted = formatCurrency(1234.56, 'TRY');
    // Accept either format since locale formatting can vary
    expect(formatted).toMatch(/TRY.*1.*235|₺.*1.*235/);
  });

  test('should handle zero amounts', () => {
    const formatted = formatCurrency(0, 'USD');
    expect(formatted).toMatch(/\$.*0/);
  });
});