import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { HintToast } from './HintToast';

test('renders hint text when trigger matches', async () => {
  // Clear any previously-seen hint flags so the hint will show
  localStorage.removeItem('bok-hint-seen-first-enemy');

  await render(<HintToast activeTriggers={['enemyNearby']} />);

  await expect.element(page.getByText('Click to attack nearby enemies')).toBeInTheDocument();
});

test('renders container but no toast when no active triggers', async () => {
  const { container } = await render(<HintToast activeTriggers={[]} />);

  const toastContainer = container.querySelector('[data-testid="hint-toast-container"]');
  expect(toastContainer).not.toBeNull();

  // No toast content should be shown
  const toast = container.querySelector('[data-testid="hint-toast"]');
  expect(toast).toBeNull();
});

test('does not show already-seen hints', async () => {
  // Mark the hint as already seen
  localStorage.setItem('bok-hint-seen-first-chest', 'true');

  const { container } = await render(<HintToast activeTriggers={['chestNearby']} />);

  const toast = container.querySelector('[data-testid="hint-toast"]');
  expect(toast).toBeNull();

  // Clean up
  localStorage.removeItem('bok-hint-seen-first-chest');
});
