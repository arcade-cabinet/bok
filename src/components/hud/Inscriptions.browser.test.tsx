import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { Inscription } from './Inscriptions';
import { Inscriptions } from './Inscriptions';

// Clear localStorage before each test so inscriptions are treated as unseen
function clearInscriptionStorage() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('bok-inscription-seen-'));
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

test('renders inscription when provided with unseen entry', async () => {
  clearInscriptionStorage();

  const pending: Inscription[] = [
    { id: 'test-biome-forest', title: 'Dark Forest', text: 'A gloomy canopy overhead.', icon: '🌲' },
  ];

  await render(<Inscriptions pending={pending} />);

  await expect.element(page.getByTestId('inscription-title')).toBeInTheDocument();
  await expect.element(page.getByText('Dark Forest')).toBeInTheDocument();
  await expect.element(page.getByText('A gloomy canopy overhead.')).toBeInTheDocument();
});

test('returns empty container when pending list is empty', async () => {
  clearInscriptionStorage();

  const { container } = await render(<Inscriptions pending={[]} />);

  const popup = container.querySelector('[data-testid="inscription-popup"]');
  expect(popup).toBeNull();
});

test('does not show already-seen inscriptions', async () => {
  clearInscriptionStorage();
  // Mark as seen
  localStorage.setItem('bok-inscription-seen-already-seen', 'true');

  const pending: Inscription[] = [
    { id: 'already-seen', title: 'Old News', text: 'You already know this.', icon: '📜' },
  ];

  const { container } = await render(<Inscriptions pending={pending} />);

  // Allow effects to run
  await new Promise((r) => setTimeout(r, 100));

  const popup = container.querySelector('[data-testid="inscription-popup"]');
  expect(popup).toBeNull();
});
