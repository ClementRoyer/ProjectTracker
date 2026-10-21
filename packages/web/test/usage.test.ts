import { describe, expect, it } from 'vitest';
import { costText, tokensText } from '../src/lib/usage';

describe('usage in the header', () => {
  it('writes token counts short', () => {
    expect([tokensText(1_234_567), tokensText(340_400), tokensText(900)]).toEqual([
      '1.2 M',
      '340 k',
      '900',
    ]);
  });

  it('writes an estimated cost without inventing a currency', () => {
    expect(costText(4.1, null)).toBe('≈ 4.1');
  });

  it('writes the cost in the configured currency', () => {
    expect(costText(4.1, 'EUR').replace(/\s/g, ' ')).toBe('≈ €4.10');
  });
});
