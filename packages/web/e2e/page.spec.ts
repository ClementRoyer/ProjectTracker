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

test('a page left open across a server restart reloads itself with the new token', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Survive a restart');
  // The first load gets a token the server no longer knows, as after a restart.
  let stale = true;
  await page.route('/', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: stale
        ? html.replace(
            /name="tracker-token" content="[^"]+"/,
            'name="tracker-token" content="stale"',
          )
        : html,
    });
    stale = false;
  });
  await page.goto('/');
  await expect(page.getByText(key)).toBeVisible();
});

test('the page works behind a proxy that keeps the Authorization header for itself (ADR 0055)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Work behind a cloud proxy');
  // Like a cloud IDE's port proxy: a request with an Authorization header is refused, empty, before the server.
  await page.route('**/api/**', async (route) => {
    if (route.request().headers().authorization) {
      await route.fulfill({ status: 401, body: '' });
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByText(key)).toBeVisible();
});
