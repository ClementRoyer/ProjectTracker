import type { Novelty, WaitingItem } from '@project-tracker/contract';
import { firstSeen, newNotices, tabTitle, type Seen } from './notifications';
import { routeHash } from './route';

/** The tab title and the browser notifications (ADR 0036). */
export class Notifier {
  private seen: Seen | null = null;

  update(waiting: readonly WaitingItem[], novelties: readonly Novelty[]): void {
    document.title = tabTitle(waiting.length);
    if (this.seen === null) {
      this.seen = firstSeen(waiting, novelties);
      return;
    }
    const { notices, seen } = newNotices(this.seen, waiting, novelties);
    this.seen = seen;
    if (!document.hidden || !canNotify()) return;
    for (const notice of notices) {
      const shown = new Notification(notice.title, { body: notice.body, tag: notice.body });
      shown.onclick = (): void => {
        window.focus();
        location.hash = routeHash({ view: 'list', key: notice.key });
        shown.close();
      };
    }
  }
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/** The browser asks only after the developer clicks (ADR 0036). */
export function mayAskToNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'default';
}
