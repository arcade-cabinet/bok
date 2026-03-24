import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { SlotData } from './Hotbar';
import { Hotbar } from './Hotbar';

const slots: SlotData[] = [
  { label: 'Sword', count: 1 },
  { label: 'Pickaxe' },
  { label: 'Stone', count: 12 },
  { label: '' },
  { label: 'Bow', count: 5 },
];

const noop = () => {};

test('renders slot labels', async () => {
  await render(<Hotbar slots={slots} activeIndex={0} onSelect={noop} />);

  await expect.element(page.getByText('Sword')).toBeInTheDocument();
  await expect.element(page.getByText('Pickaxe')).toBeInTheDocument();
  await expect.element(page.getByText('Stone')).toBeInTheDocument();
  await expect.element(page.getByText('Bow')).toBeInTheDocument();
});

test('highlights active slot with aria-pressed', async () => {
  await render(<Hotbar slots={slots} activeIndex={2} onSelect={noop} />);

  const activeBtn = page.getByRole('button', { name: /Slot 3.*selected/ });
  await expect.element(activeBtn).toBeInTheDocument();
  await expect.element(activeBtn).toHaveAttribute('aria-pressed', 'true');

  // Non-active slot should have aria-pressed false
  const otherBtn = page.getByRole('button', { name: /Slot 1/ });
  await expect.element(otherBtn).toHaveAttribute('aria-pressed', 'false');
});

test('shows resource count when present', async () => {
  await render(<Hotbar slots={slots} activeIndex={0} onSelect={noop} />);

  // Stone has count 12, displayed as "x12"
  await expect.element(page.getByText('x12')).toBeInTheDocument();
  // Bow has count 5
  await expect.element(page.getByText('x5')).toBeInTheDocument();
});

test('renders 5 slot buttons', async () => {
  const { container } = await render(<Hotbar slots={slots} activeIndex={0} onSelect={noop} />);

  const toolbar = container.querySelector('[role="toolbar"]');
  expect(toolbar).not.toBeNull();

  const buttons = toolbar?.querySelectorAll('button');
  expect(buttons.length).toBe(5);
});
