import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';

test('renders with aria-live assertive and polite regions', async () => {
  const { container } = await render(<ScreenReaderAnnouncer engineState={null} />);

  const assertive = container.querySelector('[aria-live="assertive"]');
  expect(assertive).not.toBeNull();

  const polite = container.querySelector('[aria-live="polite"]');
  expect(polite).not.toBeNull();
});

test('has sr-only class for visual hiding', async () => {
  await render(<ScreenReaderAnnouncer engineState={null} />);

  const announcer = page.getByTestId('screen-reader-announcer');
  await expect.element(announcer).toBeInTheDocument();
  await expect.element(announcer).toHaveClass('sr-only');
});

test('renders role attributes for assistive technology', async () => {
  const { container } = await render(<ScreenReaderAnnouncer engineState={null} />);

  const status = container.querySelector('[role="status"]');
  expect(status).not.toBeNull();

  const log = container.querySelector('[role="log"]');
  expect(log).not.toBeNull();
});
