import {
  getPreview,
  listDocuments,
  listNovelties,
  listTickets,
  listWaitingForMe,
  suggestNext,
  usageSummary,
  type Novelty,
  type Operation,
  type TicketSummary,
  type UsageSummaryView,
  type WaitingItem,
} from '@project-tracker/contract';
import type { z } from 'zod';
import type { Api } from './api';
import { currentInstant } from './format';
import { refusalText } from './messages';
import { Toast } from './toast.svelte';

const CLOCK_TICK_MS = 30_000;

/** What the page knows of the tracker, refreshed whenever the server says something changed. */
export class Tracker {
  tickets: TicketSummary[] = $state([]);
  /** What waits for the developer, oldest first: the triage goes through it. */
  waiting: WaitingItem[] = $state([]);
  /** The reference documents of the project (ADR 0040); read once, at start. */
  documents: string[] = $state([]);
  /** The group the list and the board show, or all of them (ADR 0040). */
  groupFilter: string | null = $state(null);
  /** What to take next (ADR 0038). */
  suggestions: { key: string; title: string; reasons: string[] }[] = $state([]);
  /** What changed since the last visit (F9): its count in the header, and the notifications (ADR 0036). */
  novelties: Novelty[] = $state([]);
  /** AI usage of the day, for the header. */
  usageToday: { tokens: number; cost: number; currency: string | null } = $state({
    tokens: 0,
    cost: 0,
    currency: null,
  });
  /** The last build of the preview (ADR 0042), or null before the first one. */
  preview: { builtAt: string; included: string[]; conflicts: { key: string }[] } | null =
    $state(null);
  /** Durations (« depuis 3 h ») move on even when nothing changes. */
  now: string = $state(currentInstant());
  /** Bumped at each change, so that open views reload what they show. */
  version = $state(0);

  /** The groups the tickets use, by name. */
  get groups(): string[] {
    const names = this.tickets.flatMap((ticket) => (ticket.group === null ? [] : [ticket.group]));
    return names.filter((name, index) => names.indexOf(name) === index).sort();
  }

  /** The tickets of the chosen group. */
  get shownTickets(): TicketSummary[] {
    const group = this.groupFilter;
    return group === null ? this.tickets : this.tickets.filter((ticket) => ticket.group === group);
  }

  readonly api: Api;
  readonly toast = new Toast();

  constructor(api: Api) {
    this.api = api;
  }

  async refresh(): Promise<void> {
    const [tickets, waiting, usage, novelties, next, preview] = await Promise.all([
      this.api.call(listTickets, { includeClosed: true }),
      this.api.call(listWaitingForMe, {}),
      this.api.call(usageSummary, { period: 'day' }),
      this.api.call(listNovelties, {}),
      this.api.call(suggestNext, {}),
      this.api.call(getPreview, {}),
    ]);
    if (preview.ok) this.preview = preview.value.preview;
    if (next.ok) this.suggestions = next.value.suggestions;
    if (novelties.ok) this.novelties = novelties.value.entries;
    if (tickets.ok) this.tickets = tickets.value.tickets;
    if (waiting.ok) this.waiting = waiting.value.items;
    if (usage.ok) this.usageToday = todayOf(usage.value);
    this.now = currentInstant();
    this.version += 1;
  }

  /** Runs an operation for the developer; a refusal is told in the toast and gives null. */
  async act<I extends z.ZodType, O extends z.ZodType>(
    operation: Operation<I, O>,
    input: z.input<I>,
  ): Promise<z.output<O> | null> {
    const answer = await this.api.call(operation, input);
    if (answer.ok) return answer.value;
    this.toast.show(refusalText(answer.error));
    return null;
  }

  /** Follows the server; returns how to stop. */
  start(): () => void {
    const stop = this.api.listen(() => void this.refresh());
    const clock = setInterval(() => {
      this.now = currentInstant();
    }, CLOCK_TICK_MS);
    void this.refresh();
    void this.api.call(listDocuments, {}).then((answer) => {
      if (answer.ok) this.documents = answer.value.documents.map((document) => document.path);
    });
    return () => {
      stop();
      clearInterval(clock);
    };
  }
}

function todayOf(usage: UsageSummaryView): {
  tokens: number;
  cost: number;
  currency: string | null;
} {
  const today = usage.periods.find((period) => period.period === usage.current);
  return {
    tokens: (today?.measuredTokens ?? 0) + (today?.declaredTokens ?? 0),
    cost: today?.estimatedCost ?? 0,
    currency: usage.currency,
  };
}
