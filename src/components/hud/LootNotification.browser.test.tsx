import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { LootItem } from './LootNotification';
import { LootNotification } from './LootNotification';

test('shows item name and amount when items are provided', async () => {
  const items: LootItem[] = [{ name: 'Gold Ore', amount: 3 }];

  await render(<LootNotification items={items} />);

  await expect.element(page.getByText('+3')).toBeInTheDocument();
  await expect.element(page.getByText('Gold Ore')).toBeInTheDocument();
});

test('renders notification card with data-testid', async () => {
  const items: LootItem[] = [{ name: 'Iron Ingot', amount: 1 }];

  const { container } = await render(<LootNotification items={items} />);

  const card = container.querySelector('[data-testid="loot-item"]');
  expect(card).not.toBeNull();
});

test('renders container even with empty items list', async () => {
  const { container } = await render(<LootNotification items={[]} />);

  const notifContainer = container.querySelector('[data-testid="loot-notifications"]');
  expect(notifContainer).not.toBeNull();

  // No loot-item cards when no items
  const cards = container.querySelectorAll('[data-testid="loot-item"]');
  expect(cards.length).toBe(0);
});
