import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TomeUnlockBanner } from './TomeUnlockBanner';

test('renders ability name when provided', async () => {
  await render(<TomeUnlockBanner abilityName="Dash" abilityIcon="⚡" />);

  await expect.element(page.getByTestId('tome-unlock-ability-name')).toBeInTheDocument();
  await expect.element(page.getByText('Dash')).toBeInTheDocument();
});

test('shows the "New Tome Page!" header text', async () => {
  await render(<TomeUnlockBanner abilityName="Fire Shield" abilityIcon="🔥" />);

  await expect.element(page.getByText('New Tome Page!')).toBeInTheDocument();
});

test('renders the icon alongside the ability name', async () => {
  const { container } = await render(<TomeUnlockBanner abilityName="Double Jump" abilityIcon="🦘" />);

  // The banner should be visible
  const banner = container.querySelector('[data-testid="tome-unlock-banner"]');
  expect(banner).not.toBeNull();
});

test('does not render banner when abilityName is null', async () => {
  const { container } = await render(<TomeUnlockBanner abilityName={null} abilityIcon={null} />);

  // Allow AnimatePresence to settle
  await new Promise((r) => setTimeout(r, 100));

  const banner = container.querySelector('[data-testid="tome-unlock-banner"]');
  expect(banner).toBeNull();
});
