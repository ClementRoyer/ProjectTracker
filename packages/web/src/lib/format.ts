const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A short French duration from `since` to `now`: « maintenant », « 12 min », « 3 h », « 2 j ». */
export function ago(since: string, now: string): string {
  const elapsed = Date.parse(now) - Date.parse(since);
  if (elapsed < MINUTE) return 'maintenant';
  if (elapsed < HOUR) return `${String(Math.floor(elapsed / MINUTE))} min`;
  if (elapsed < DAY) return `${String(Math.floor(elapsed / HOUR))} h`;
  return `${String(Math.floor(elapsed / DAY))} j`;
}

/** « depuis 3 h », or « depuis moins d’une minute » rather than « depuis maintenant ». */
export function since(at: string, now: string): string {
  const elapsed = ago(at, now);
  return elapsed === 'maintenant' ? 'depuis moins d’une minute' : `depuis ${elapsed}`;
}

/** A date as the journal shows it: « 9 oct. », with the time when asked. */
export function shortDate(at: string, withTime = false): string {
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat('fr-FR', options).format(new Date(at));
}

/** The current instant, as the server writes them. */
export function currentInstant(): string {
  return new Date().toISOString();
}
