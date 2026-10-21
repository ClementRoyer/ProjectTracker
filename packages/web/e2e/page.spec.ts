import { expect, test } from '@playwright/test';
import { createTicket } from './tracker';

test('the page lists a ticket created through the API, and follows changes live', async ({
  page,
  request,
}) => {
  await createTicket(request, 'Clean the test server logs');
  await page.goto('/');
  const list = page.getByRole('complementary', { name: 'Tickets' });
  await expect(list).toContainText('Clean the test server logs');

  await createTicket(request, 'Paginate the customer list');
  await expect(list).toContainText('Paginate the customer list');
});

test('the theme button switches between light and dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the dark theme follows the system until the developer chooses', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const background = (): Promise<string> =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await background()).toBe('rgb(18, 18, 20)');
  await page.reload();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  expect(await background()).toBe('rgb(246, 245, 241)');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.reload();
  expect(await background()).toBe('rgb(18, 18, 20)');
});
