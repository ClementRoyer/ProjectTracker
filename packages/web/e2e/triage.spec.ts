import { expect, test } from '@playwright/test';
import { agent, createTicket, developerCall } from './tracker';

test('the triage goes through what waits for the developer, one at a time', async ({
  page,
  request,
}) => {
  const asked = await createTicket(request, 'Search by phone number');
  const front = await agent(request, 'front-phone');
  await front('takeTicket', { key: asked, role: 'front' });
  await front('askQuestion', {
    key: asked,
    text: 'Keep the country code?',
    options: ['Yes', 'No'],
    recommendation: 'Yes',
  });
  const validated = await createTicket(request, 'Show the order date');
  const batch = (await developerCall(request, 'deliverBatch', {
    name: 'Lot',
    keys: [validated],
  })) as { id: string };
  await developerCall(request, 'validateBatch', { batchId: batch.id });

  await page.goto('/');
  await page.getByRole('button', { name: /t’attend/ }).click();
  const triage = page.getByRole('dialog', { name: 'Triage' });

  // Older items from other journeys may come first: go through them until ours.
  for (let step = 0; step < 20; step += 1) {
    if (await triage.getByText('Keep the country code?').isVisible()) break;
    await triage.getByRole('button', { name: 'Plus tard' }).click();
  }
  await triage.getByRole('button', { name: /Yes/ }).click();
  await expect(triage.getByText('Keep the country code?')).toHaveCount(0);

  for (let step = 0; step < 20; step += 1) {
    if (await triage.getByText(validated).isVisible()) break;
    await triage.getByRole('button', { name: 'Plus tard' }).click();
  }
  await triage.getByRole('button', { name: /Déclarer terminé/ }).click();
  await expect(triage.getByText(validated)).toHaveCount(0);

  const inbox = (await front('listInbox', {})) as { items: { body: string }[] };
  expect(inbox.items.map((item) => item.body)).toEqual(['Yes']);
  await triage.getByRole('button', { name: 'Fermer' }).click();
  await expect(triage).toBeHidden();
});
