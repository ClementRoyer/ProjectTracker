import { expect, test } from '@playwright/test';
import { agent, createTicket, developerCall } from './tracker';

test('the ticket shows what its agent wrote, in a discussion', async ({ page, request }) => {
  const key = await createTicket(request, 'Search by city');
  const front = await agent(request, 'front-city');
  await front('takeTicket', { key, role: 'front' });
  await front('recordEntry', { key, entryType: 'progress', body: 'Form done, sorting next.' });

  await page.goto(`/#/ticket/${key}`);
  const discussion = page.getByRole('region', { name: 'Discussion' });
  await expect(discussion).toContainText('Form done, sorting next.');
  await expect(discussion).toContainText('front-city');
});

test('answering a question with one of its options reaches the agent', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Search by zip code');
  const front = await agent(request, 'front-zip');
  await front('takeTicket', { key, role: 'front' });
  await front('askQuestion', {
    key,
    text: 'Which matching rule?',
    context: 'Compound names are not found today.',
    options: ['Start of each word', 'Anywhere'],
    recommendation: 'Start of each word',
  });

  await page.goto(`/#/ticket/${key}`);
  const card = page.getByRole('group', { name: 'Question for you' });
  await expect(card).toContainText('Compound names are not found today.');
  await card.getByRole('button', { name: /Start of each word/ }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Discussion' })).toContainText(
    'not acknowledged yet',
  );
  const inbox = (await front('listInbox', {})) as { items: { body: string }[] };
  expect(inbox.items.map((item) => item.body)).toEqual(['Start of each word']);
});

test('changing the phase resets the progress and says so in the discussion', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Rename the export button');
  await page.goto(`/#/ticket/${key}`);
  await page.getByRole('button', { name: 'Change phase' }).click();
  await page.getByRole('menuitem', { name: 'Test' }).click();
  await expect(page.getByRole('list', { name: 'Phase' }).locator('.now')).toHaveText('Test');
  await expect(page.getByRole('region', { name: 'Discussion' })).toContainText(
    'Phase: To do → Test',
  );
  await expect(page.getByRole('main', { name: `Ticket ${key}` })).toContainText('Not started');
});

test('a ticket can be declared done only after its QA validation', async ({ page, request }) => {
  const key = await createTicket(request, 'Fix the date format');
  await page.goto(`/#/ticket/${key}`);
  const close = page.getByRole('button', { name: 'Close ticket' });
  await expect(close).toBeDisabled();

  const batch = (await developerCall(request, 'deliverBatch', { name: 'Batch', keys: [key] })) as {
    id: string;
  };
  await developerCall(request, 'validateBatch', { batchId: batch.id });
  await expect(close).toBeEnabled();
  await close.click();
  await expect(page.getByRole('main', { name: `Ticket ${key}` })).toContainText('Closed on');
});

test('a message to the front assignee reaches its next call', async ({ page, request }) => {
  const key = await createTicket(request, 'Add a loading state');
  const front = await agent(request, 'front-loading');
  await front('takeTicket', { key, role: 'front' });

  await page.goto(`/#/ticket/${key}`);
  await page.getByLabel('Message').fill('Use the existing spinner.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('region', { name: 'Discussion' })).toContainText(
    'Use the existing spinner.',
  );
  const inbox = (await front('listInbox', {})) as { items: { body: string }[] };
  expect(inbox.items.map((item) => item.body)).toEqual(['Use the existing spinner.']);
});

test('setting the priority marks the ticket in the list, and is noted in the journal', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Fix the payment error');
  await page.goto(`/#/ticket/${key}`);
  await page.getByLabel('Priority').selectOption('urgent');
  await expect(page.getByRole('region', { name: 'Discussion' })).toContainText(
    'Priority: normal → urgent',
  );
  // The row of the list; the ticket may also be suggested in "Up next".
  await expect(page.locator('a.row', { hasText: key })).toContainText('Urgent');
});

test('the folder shows the last test run of each kind, failed ones in colour', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Check the export');
  const front = await agent(request, 'front-tests');
  await front('recordTestRun', { key, kind: 'auto', passed: true, note: '16 of 16' });
  await front('recordTestRun', { key, kind: 'visual', passed: false, note: 'button cut on phone' });
  await page.goto(`/#/ticket/${key}`);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await expect(folder).toContainText('Automatic tests passed: 16 of 16');
  await expect(folder).toContainText('Visual tests failed: button cut on phone');
});

test('the folder lists the changed files, and those shared with another ticket (F23)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Change the list view');
  const other = await createTicket(request, 'Change the list sort');
  await developerCall(request, 'reportChangedFiles', {
    key,
    files: ['src/ui/list.ts', 'src/ui/view.ts'],
  });
  await developerCall(request, 'reportChangedFiles', { key: other, files: ['src/ui/list.ts'] });
  await page.goto(`/#/ticket/${key}`);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await expect(folder).toContainText('src/ui/view.ts');
  await expect(folder).toContainText(`src/ui/list.ts · also ${other}`);
});

test('the folder shows the working folder, and says to remove it once the ticket is closed (ADR 0041)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Change the search page');
  await developerCall(request, 'setWorktree', {
    key,
    path: `.worktrees/${key}`,
    branch: `ticket/${key}`,
  });
  await page.goto(`/#/ticket/${key}`);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await expect(folder).toContainText(`.worktrees/${key} · branch ticket/${key}`);
  await expect(folder).not.toContainText('tracker worktree remove');

  const batch = (await developerCall(request, 'deliverBatch', { name: 'Batch', keys: [key] })) as {
    id: string;
  };
  await developerCall(request, 'validateBatch', { batchId: batch.id });
  await developerCall(request, 'closeTicket', { key });
  await expect(folder).toContainText(`Still there: tracker worktree remove ${key}`);
});

test('the developer notes a manual test from the folder (F24)', async ({ page, request }) => {
  const key = await createTicket(request, 'Check the colours');
  await page.goto(`/#/ticket/${key}`);
  const folder = page.getByRole('complementary', { name: 'Ticket file' });
  await folder.getByRole('button', { name: 'Record a manual test' }).click();
  const form = folder.getByRole('form', { name: 'Record a manual test' });
  await form.getByLabel('Test').selectOption('user');
  await form.getByLabel('failed').check();
  await form.getByLabel('Feedback').fill('The button is too small');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(folder).toContainText('User tests failed: The button is too small');
});

test('a capture joined to a message shows in the discussion and reaches the agent (F30)', async ({
  page,
  request,
}) => {
  const key = await createTicket(request, 'Fix the cut button');
  const front = await agent(request, 'front-capture');
  await front('takeTicket', { key, role: 'front' });
  // A 1×1 PNG.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.goto(`/#/ticket/${key}`);
  await page.getByLabel('Files to attach').setInputFiles({
    name: 'capture.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(page.getByRole('list', { name: 'Files to attach' })).toContainText('capture.png');
  await page.getByLabel('Message').fill('The button is cut on phones.');
  await page.getByRole('button', { name: 'Send' }).click();

  const discussion = page.getByRole('region', { name: 'Discussion' });
  await expect(discussion.getByRole('img', { name: 'capture.png' })).toBeVisible();
  const inbox = (await front('listInbox', {})) as {
    items: { attachments: { name: string; path: string }[] }[];
  };
  expect(inbox.items[0]?.attachments[0]?.name).toBe('capture.png');
  expect(inbox.items[0]?.attachments[0]?.path).toMatch(/attachments/);
});

test('a file dropped on the ticket waits in the composer', async ({ page, request }) => {
  const key = await createTicket(request, 'Read the server log');
  await page.goto(`/#/ticket/${key}`);
  await page.getByRole('main', { name: `Ticket ${key}` }).evaluate((main) => {
    const data = new DataTransfer();
    data.items.add(new File(['log line'], 'server.log', { type: 'text/plain' }));
    main.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true }));
  });
  await expect(page.getByRole('list', { name: 'Files to attach' })).toContainText('server.log');
});
