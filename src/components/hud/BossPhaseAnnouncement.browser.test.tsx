import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { BossPhaseAnnouncement } from './BossPhaseAnnouncement';

test('shows announcement text when provided', async () => {
  await render(<BossPhaseAnnouncement text="Ancient Treant enrages!" onDone={() => {}} />);

  // Text is uppercased via toUpperCase()
  await expect.element(page.getByText('ANCIENT TREANT ENRAGES!')).toBeInTheDocument();
});

test('renders with role="alert" for accessibility', async () => {
  await render(<BossPhaseAnnouncement text="Phase 2 begins!" onDone={() => {}} />);

  await expect.element(page.getByRole('alert')).toBeInTheDocument();
});

test('returns null when text is null', async () => {
  const onDone = vi.fn();
  const { container } = await render(<BossPhaseAnnouncement text={null} onDone={onDone} />);

  expect(container.innerHTML).toBe('');
});
