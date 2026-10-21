import { expect, test, type Page } from '@playwright/test';
import { agent, createTicket } from './tracker';

const pageFitsTheScreen = (page: Page): Promise<boolean> =>
  page.evaluate(
    () =>
      document.documentElement.scrollHeight <= window.innerHeight &&
      document.documentElement.scrollWidth <= window.innerWidth,
  );

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
]) {
  test(`at ${String(viewport.width)}×${String(viewport.height)}, the page holds in one screen and the composer stays in sight`, async ({
    page,
    request,
  }) => {
    const key = await createTicket(request, 'Fit the screen');
    const front = await agent(request, `front-fit-${String(viewport.width)}`);
    await front('takeTicket', { key, role: 'front' });
    for (let index = 0; index < 15; index += 1) {
      await front('recordEntry', {
        key,
        entryType: 'progress',
        body: `Step ${String(index)} done.`,
      });
    }
    await front('askQuestion', { key, text: 'Which rule?', options: ['One', 'Two'] });

    await page.setViewportSize(viewport);
    await page.goto(`/#/ticket/${key}`);
    await expect(page.getByRole('group', { name: 'Question for you' })).toBeInViewport();
    expect(await pageFitsTheScreen(page)).toBe(true);
    await expect(page.getByRole('button', { name: 'Send' })).toBeInViewport();

    for (const hash of ['#/', '#/tableau', '#/bilan']) {
      await page.goto(`/${hash}`);
      expect(await pageFitsTheScreen(page)).toBe(true);
    }
  });
}
