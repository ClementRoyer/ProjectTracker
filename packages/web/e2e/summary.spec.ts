import { expect, test } from '@playwright/test';
import { agent, createTicket, developerCall } from './tracker';

test('a QA delivery is noted from the tickets whose tests are done, then validated', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Show the delivery address');
  await developerCall(request, 'changePhase', { key, phase: 'test' });
  await developerCall(request, 'reportProgress', { key, progress: { state: 'done' } });

  await page.goto('/#/bilan');
  const next = page.getByRole('region', { name: 'Next QA delivery' });
  await expect(next).toContainText(key);
  // Only this journey's ticket goes into the delivery.
  for (const box of await next.getByRole('checkbox').all()) {
    const label = await box.locator('..').innerText();
    if (!label.includes(key)) await box.uncheck();
  }
  await next.getByLabel('Delivery name').fill(`Delivery ${key}`);
  await next.getByRole('button', { name: 'Record as delivered to QA' }).click();
  await expect(next.getByRole('status')).toContainText('1 tickets move to "QA delivery"');

  const past = page.getByRole('region', { name: 'Past deliveries' });
  const batch = past.locator('.batch', { hasText: `Delivery ${key}` });
  await expect(batch).toContainText('to validate');
  await batch.getByRole('button', { name: 'Record as validated' }).click();
  await expect(batch).toContainText('validated on');
});

test('the AI usage is shown by period and by ticket', async ({ page, request }) => {
  const key = await createTicket(request, 'Count the tokens');
  const front = await agent(request, 'front-tokens');
  await front('takeTicket', { key, role: 'front' });
  await front('recordUsage', {
    key,
    provenance: 'declared',
    usage: [
      {
        model: 'model-b',
        inputTokens: 5000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    ],
  });

  await page.goto('/#/bilan');
  const usage = page.getByRole('region', { name: 'AI usage' });
  await expect(usage).toContainText('Week');
  await usage.getByRole('button', { name: 'Day' }).click();
  await expect(usage).toContainText('Today');
  await expect(usage.locator('.by-ticket', { hasText: key })).toContainText('5 k');
});

test('the developer accepts the changelog line an agent proposed (F22)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Search by city');
  const front = await agent(request, 'front-changelog');
  await front('proposeChangelog', { key, line: 'search by city' });
  await page.goto(`/#/ticket/${key}`);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await expect(folder).toContainText('Proposed: search by city');
  await folder.getByRole('button', { name: 'Review and accept' }).click();
  await folder.getByLabel('Changelog line', { exact: true }).fill('Search customers by city');
  await folder.getByRole('button', { name: 'Accept' }).click();
  await expect(folder).toContainText('Search customers by city');
  await expect(folder).not.toContainText('Proposed');
});

test('the reference documents of the project can be read from the page (F31)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'README.md' }).click();
  await expect(page.getByRole('article', { name: 'README.md' })).toContainText(
    'The project rules.',
  );
});

test('a delivery with a working folder gives the command that merges its branches (ADR 0044)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Show the delivery date');
  await developerCall(request, 'changePhase', { key, phase: 'test' });
  await developerCall(request, 'reportProgress', { key, progress: { state: 'done' } });
  await developerCall(request, 'setWorktree', {
    key,
    path: `.worktrees/${key}`,
    branch: `ticket/${key}`,
  });

  await page.goto('/#/bilan');
  const next = page.getByRole('region', { name: 'Next QA delivery' });
  await expect(next).toContainText(key);
  for (const box of await next.getByRole('checkbox').all()) {
    const label = await box.locator('..').innerText();
    if (!label.includes(key)) await box.uncheck();
  }
  await next.getByLabel('Delivery name').fill('Batch "12"');
  await expect(next.getByRole('button', { name: 'Record as delivered to QA' })).toHaveCount(0);
  await expect(next.getByLabel('Delivery command')).toHaveText(
    `node tools/tracker/app/tracker.js deliver "Batch \\"12\\"" ${key}`,
  );
});
