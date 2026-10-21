import { expect, test } from '@playwright/test';
import { agent, createTicket, developerCall } from './tracker';

test('the board puts each ticket in the column of its phase', async ({ page, request }) => {
  const key = await createTicket(request, 'Translate the error messages');
  await developerCall(request, 'changePhase', { key, phase: 'test' });
  await page.goto('/#/tableau');
  const column = page.getByRole('region', { name: 'TEST' });
  await expect(column.getByRole('link', { name: new RegExp(key) })).toBeVisible();

  await column.getByRole('link', { name: new RegExp(key) }).click();
  await expect(page).toHaveURL(new RegExp(`#/ticket/${key}$`));
  await expect(page.getByRole('heading', { name: 'Translate the error messages' })).toBeVisible();
});

test('a ticket created in one sentence opens at once, and stays local', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nouveau ticket local').fill('Archive old quotes');
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { name: 'Archive old quotes' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('rien n’est envoyé à Jira');
});

test('loading Jira tells what came in, and that nothing was written there', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Charger Jira' }).click();
  const toast = page.getByRole('status');
  await expect(toast).toContainText('Chargement Jira terminé');
  await expect(toast).toContainText('Rien n’a été écrit dans Jira.');
  await expect(page.getByRole('complementary', { name: 'Tickets' })).toContainText('DEMO-1');
});

test('the header shows the AI usage of the day', async ({ page, request }) => {
  const key = await createTicket(request, 'Measure the usage');
  const front = await agent(request, 'front-usage');
  await front('takeTicket', { key, role: 'front' });
  const line = { model: 'model-a', inputTokens: 1_200_000, outputTokens: 0 };
  await front('recordUsage', {
    key,
    provenance: 'measured',
    usage: [{ ...line, cacheReadTokens: 0, cacheWriteTokens: 0 }],
  });
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('IA aujourd’hui : 1,2 M jetons');
});
