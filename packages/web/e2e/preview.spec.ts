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
  const pill = page.getByRole('status', { name: 'Preview' });
  await expect(pill).toHaveText(/^Preview: 1 ticket.* · 1 conflict$/);
  await expect(pill).toHaveAttribute('title', /Rebuilt just now/);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await expect(folder).toContainText('In the preview');

  await page.goto(`/#/ticket/${left}`);
  await expect(folder).toContainText(`Conflict with the preview: src/search.ts · with ${merged}`);
});
