import { expect, test } from '@playwright/test';
import { createTicket, developerCall } from './tracker';

test('the header and each ticket show the last build of the preview, and its conflicts (ADR 0042)', async ({
  page,
  request,
}) => {
  const merged = await createTicket(request, 'Search by name');
  const left = await createTicket(request, 'Search by city');
  for (const key of [merged, left]) {
    await developerCall(request, 'setWorktree', {
      key,
      path: `.worktrees/${key}`,
      branch: `ticket/${key}`,
    });
  }
  await developerCall(request, 'recordPreview', {
    included: [merged],
    conflicts: [{ key: left, files: ['src/search.ts'], with: [merged] }],
  });

  await page.goto(`/#/ticket/${merged}`);
  const pill = page.getByRole('status', { name: 'Aperçu' });
  await expect(pill).toHaveText(/^Aperçu : 1 ticket.* · 1 conflit$/);
  await expect(pill).toHaveAttribute('title', /Reconstruit à l’instant/);
  const folder = page.getByRole('complementary', { name: 'Dossier du ticket' });
  await expect(folder).toContainText('Dans l’aperçu');

  await page.goto(`/#/ticket/${left}`);
  await expect(folder).toContainText(`Conflit avec l’aperçu : src/search.ts · avec ${merged}`);
});
