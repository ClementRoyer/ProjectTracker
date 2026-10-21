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
  const next = page.getByRole('region', { name: 'Prochaine livraison en qualité' });
  await expect(next).toContainText(key);
  // Only this journey's ticket goes into the delivery.
  for (const box of await next.getByRole('checkbox').all()) {
    const label = await box.locator('..').innerText();
    if (!label.includes(key)) await box.uncheck();
  }
  await next.getByLabel('Nom de la livraison').fill(`Livraison ${key}`);
  await next.getByRole('button', { name: 'Noter comme livrée en qualité' }).click();
  await expect(next.getByRole('status')).toContainText(
    '1 tickets passent en « Livraison qualité »',
  );

  const past = page.getByRole('region', { name: 'Livraisons passées' });
  const batch = past.locator('.batch', { hasText: `Livraison ${key}` });
  await expect(batch).toContainText('à valider');
  await batch.getByRole('button', { name: 'Noter validée' }).click();
  await expect(batch).toContainText('validée le');
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
  const usage = page.getByRole('region', { name: 'Usage de l’IA' });
  await expect(usage).toContainText('Semaine');
  await usage.getByRole('button', { name: 'Jour' }).click();
  await expect(usage).toContainText('Aujourd’hui');
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
  const folder = page.getByRole('complementary', { name: 'Dossier du ticket' });
  await expect(folder).toContainText('Proposée : search by city');
  await folder.getByRole('button', { name: 'Relire et accepter' }).click();
  await folder.getByLabel('Ligne de changelog', { exact: true }).fill('Search customers by city');
  await folder.getByRole('button', { name: 'Accepter' }).click();
  await expect(folder).toContainText('Search customers by city');
  await expect(folder).not.toContainText('Proposée');
});

test('the reference documents of the project can be read from the page (F31)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'README.md' }).click();
  await expect(page.getByRole('article', { name: 'README.md' })).toContainText(
    'Les règles du projet.',
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
  const next = page.getByRole('region', { name: 'Prochaine livraison en qualité' });
  await expect(next).toContainText(key);
  for (const box of await next.getByRole('checkbox').all()) {
    const label = await box.locator('..').innerText();
    if (!label.includes(key)) await box.uncheck();
  }
  await next.getByLabel('Nom de la livraison').fill('Lot "12"');
  await expect(next.getByRole('button', { name: 'Noter comme livrée en qualité' })).toHaveCount(0);
  await expect(next.getByLabel('Commande de livraison')).toHaveText(
    `node tools/tracker/app/tracker.js deliver "Lot \\"12\\"" ${key}`,
  );
});
