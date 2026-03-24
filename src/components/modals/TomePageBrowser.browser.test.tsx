import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { type TomePage, TomePageBrowser } from './TomePageBrowser';

const unlockedPage: TomePage = {
  id: 'dash',
  name: 'Dash',
  description: 'Burst forward with uncanny speed, phasing through enemies.',
  icon: '💨',
  level: 2,
};

test('renders tome pages heading and page count', async () => {
  await render(<TomePageBrowser pages={[unlockedPage]} onClose={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'Tome Pages' })).toBeVisible();
  await expect.element(page.getByText('1 of 8 pages inscribed')).toBeVisible();
});

test('shows unlocked page name and locked badges for the rest', async () => {
  await render(<TomePageBrowser pages={[unlockedPage]} onClose={() => {}} />);

  // The unlocked page shows its real name
  await expect.element(page.getByText('Dash')).toBeInTheDocument();

  // Locked pages display "Locked" badges (7 of 8 are locked)
  const lockedBadges = page.getByText('Locked');
  await expect.element(lockedBadges.first()).toBeInTheDocument();
});

test('shows close button', async () => {
  await render(<TomePageBrowser pages={[]} onClose={() => {}} />);

  await expect.element(page.getByText('Close')).toBeVisible();
});
