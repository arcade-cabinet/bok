import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { InventoryModal } from './InventoryModal';

test('renders Inventory heading', async () => {
  await render(<InventoryModal inventory={{}} onClose={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
});

test('shows tab buttons for all categories', async () => {
  await render(<InventoryModal inventory={{}} onClose={() => {}} />);

  await expect.element(page.getByRole('tab', { name: /Materials/ })).toBeInTheDocument();
  await expect.element(page.getByRole('tab', { name: /Weapons/ })).toBeInTheDocument();
  await expect.element(page.getByRole('tab', { name: /Consumables/ })).toBeInTheDocument();
});

test('renders items in the correct tab', async () => {
  const inventory = { wood: 10, stone: 5, 'iron-sword': 1, 'health-potion': 3 };
  const { container } = await render(<InventoryModal inventory={inventory} onClose={() => {}} />);

  // Materials tab is active by default — wood and stone should be visible
  const woodItem = container.querySelector('[data-testid="item-wood"]');
  expect(woodItem).not.toBeNull();
  const stoneItem = container.querySelector('[data-testid="item-stone"]');
  expect(stoneItem).not.toBeNull();
});

test('switching to Weapons tab shows weapon items', async () => {
  const inventory = { wood: 10, 'iron-sword': 1 };
  const { container } = await render(<InventoryModal inventory={inventory} onClose={() => {}} />);

  await page.getByRole('tab', { name: /Weapons/ }).click();

  const swordItem = container.querySelector('[data-testid="item-iron-sword"]');
  expect(swordItem).not.toBeNull();
});

test('Close button calls onClose', async () => {
  const onClose = vi.fn();
  await render(<InventoryModal inventory={{}} onClose={onClose} />);

  await page.getByRole('button', { name: 'Close' }).click();

  expect(onClose).toHaveBeenCalledOnce();
});
