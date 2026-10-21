import { expect, test } from '@playwright/test';
import { agent, createTicket, developerCall } from './tracker';

test('a question of an agent puts its ticket under « À TOI »', async ({ page, request }) => {
  const key = await createTicket(request, 'Search by customer name');
  const front = await agent(request, 'front-search');
  await front('takeTicket', { key, role: 'front' });
  await front('askQuestion', { key, text: 'Which matching rule?' });

  await page.goto('/');
  const mine = page.getByRole('region', { name: 'À TOI' });
  await expect(mine.getByRole('link', { name: new RegExp(key) })).toContainText(
    'Attend ta réponse depuis',
  );
});

test('a group folds away and shows the keys it hides', async ({ page, request }) => {
  const key = await createTicket(request, 'Paginate the order list');
  await page.goto('/');
  const notStarted = page.getByRole('region', { name: 'PAS COMMENCÉS' });
  await notStarted.getByRole('button', { name: /PAS COMMENCÉS/ }).click();
  await expect(notStarted.getByRole('link')).toHaveCount(0);
  await expect(notStarted.getByRole('button')).toContainText(key);
});

test('choosing a ticket marks it and puts it in the address', async ({ page, request }) => {
  const key = await createTicket(request, 'Export the invoices');
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(key) }).click();
  await expect(page).toHaveURL(new RegExp(`#/ticket/${key}$`));
  await expect(page.getByRole('link', { name: new RegExp(key) })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('opening a ticket clears its unread mark, and only its own', async ({ page, request }) => {
  const opened = await createTicket(request, 'Read me first');
  const other = await createTicket(request, 'Read me later');
  const front = await agent(request, 'front-unread');
  for (const key of [opened, other]) {
    await front('takeTicket', { key, role: 'front' });
    await front('recordEntry', { key, entryType: 'progress', body: 'Started.' });
  }

  await page.goto(`/#/ticket/${opened}`);
  const row = (key: string) => page.getByRole('link', { name: new RegExp(`^${key} `) });
  await expect(row(opened).getByRole('img', { name: 'Nouveautés' })).toHaveCount(0);
  await expect(row(other).getByRole('img', { name: 'Nouveautés' })).toHaveCount(1);
});

test('the novelties screen gathers what agents did since the last visit, until marked seen', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Translate the invoices');
  const front = await agent(request, 'front-novelties');
  await front('recordEntry', { key, entryType: 'progress', body: 'Invoices translated.' });

  await page.goto('/');
  await page.getByRole('link', { name: /^Nouveautés/ }).click();
  const screen = page.getByRole('main', { name: 'Nouveautés' });
  await expect(screen.getByRole('region', { name: key })).toContainText('Invoices translated.');

  await screen.getByRole('button', { name: 'Tout marquer vu' }).click();
  await expect(screen).toContainText('Rien de neuf depuis ta dernière visite.');
  await expect(page.getByRole('link', { name: 'Nouveautés' })).toHaveCount(0);
});

test('the tab title counts the decisions waiting for the developer (F26)', async ({
  page,
  request,
}) => {
  await page.goto('/');
  // What already waits comes from the API: the page may not have loaded it yet.
  const waiting = (await developerCall(request, 'listWaitingForMe', {})) as { items: unknown[] };
  const before = waiting.items.length;
  const key = await createTicket(request, 'Pick the date format');
  const front = await agent(request, 'front-title');
  await front('takeTicket', { key, role: 'front' });
  await front('askQuestion', { key, text: 'Day first?' });
  await expect(page).toHaveTitle(`(${String(before + 1)}) project-tracker`);
});

test('the page does not ask for notifications once the browser allows them (ADR 0036)', async ({
  page,
  context,
}) => {
  // Headless Chromium starts with notifications denied, so the asking button itself is checked by hand.
  await context.grantPermissions(['notifications']);
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activer les notifications' })).toHaveCount(0);
});

test('the list suggests what to take next, with its reasons (F21)', async ({ page, request }) => {
  const key = await createTicket(request, 'Fix the invoice total');
  await page.goto(`/#/ticket/${key}`);
  await page.getByLabel('Taille').selectOption('small');
  await page.getByLabel('Priorité').selectOption('urgent');
  const next = page.getByRole('region', { name: 'À prendre ensuite' });
  await expect(next.getByRole('link', { name: new RegExp(key) })).toContainText(
    'priorité urgente · gain rapide',
  );
});

test('a ticket goes in a group, and the list shows only that group when asked (F31)', async ({
  page,
  request,
}) => {
  const grouped = await createTicket(request, 'Search by zip');
  const other = await createTicket(request, 'Rename the menu');
  await developerCall(request, 'setGroup', { key: grouped, group: 'Search' });
  await page.goto('/');
  await page.getByLabel('Groupe', { exact: true }).selectOption('Search');
  const list = page.getByRole('complementary', { name: 'Tickets' });
  await expect(list.locator('a.row', { hasText: grouped })).toContainText('Search');
  await expect(list.locator('a.row', { hasText: other })).toHaveCount(0);
});
