/** « 1,2 M », « 340 k », « 900 » jetons. */
export function tokensText(tokens: number): string {
  const short = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  if (tokens >= 1_000_000) return `${short.format(tokens / 1_000_000)} M`;
  if (tokens >= 1_000) return `${short.format(Math.round(tokens / 1_000))} k`;
  return short.format(tokens);
}

/** The cost in the configured currency (ADR 0029); without one, a plain number. */
export function costText(cost: number, currency: string | null): string {
  const format = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    ...(currency === null ? {} : { style: 'currency', currency }),
  });
  return `≈ ${format.format(cost)}`;
}
