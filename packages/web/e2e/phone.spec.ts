import { expect, test, type Page } from '@playwright/test';
import { agent, createTicket } from './tracker';

const hasNoSideScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('on a phone, the list and a ticket each take the whole screen', async ({ page, request }) => {
  const key = await createTicket(request, 'Search from a phone');
  const front = await agent(request, 'front-phone-screen');
  await front('takeTicket', { key, role: 'front' });
  await front('askQuestion', { key, text: 'Show the keyboard at once?', options: ['Yes', 'No'] });

  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Tickets' })).toBeVisible();
  expect(await hasNoSideScroll(page)).toBe(true);

  await page.getByRole('link', { name: new RegExp(key) }).click();
  await expect(page.getByRole('complementary', { name: 'Tickets' })).toBeHidden();
  await page.getByRole('button', { name: /Yes/ }).click();
  await expect(page.getByRole('group', { name: 'Question pour toi' })).toHaveCount(0);
  expect(await hasNoSideScroll(page)).toBe(true);

  await page.getByRole('link', { name: '← Tickets' }).click();
  await expect(page.getByRole('complementary', { name: 'Tickets' })).toBeVisible();
});

test('on a phone, the board scrolls inside itself, not the page', async ({ page }) => {
  await page.goto('/#/tableau');
  await expect(page.getByRole('region', { name: 'À FAIRE' })).toBeVisible();
  expect(await hasNoSideScroll(page)).toBe(true);
});
