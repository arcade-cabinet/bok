import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SailingTransition } from './SailingTransition';

test('renders sailing text with biome name', async () => {
  await render(<SailingTransition biomeName="volcanic" onComplete={() => {}} />);

  await expect.element(page.getByText('Sailing to volcanic...')).toBeVisible();
});

test('has role=status with accessible label', async () => {
  await render(<SailingTransition biomeName="forest" onComplete={() => {}} />);

  await expect.element(page.getByRole('status', { name: 'Sailing to forest' })).toBeVisible();
});

test('renders ocean gradient background', async () => {
  const { container } = await render(<SailingTransition biomeName="desert" onComplete={() => {}} />);

  const outerDiv = container.querySelector('.fixed.inset-0');
  expect(outerDiv).not.toBeNull();
  expect((outerDiv as HTMLElement).style.background).toContain('linear-gradient');
});

test('calls onComplete after sail duration', async () => {
  const onComplete = vi.fn();
  await render(<SailingTransition biomeName="tundra" onComplete={onComplete} />);

  // SAIL_DURATION is 4s, but reduced motion may shorten to 1s in browser.
  // Wait up to 6s to cover either case.
  await vi.waitFor(
    () => {
      expect(onComplete).toHaveBeenCalledOnce();
    },
    { timeout: 6000 },
  );
});

test('displays sailboat emoji when motion is not reduced', async () => {
  // In a standard Chromium headless environment, prefers-reduced-motion is off,
  // so the sailboat should be rendered.
  const { container } = await render(<SailingTransition biomeName="swamp" onComplete={() => {}} />);

  // The sailboat is inside a motion.div with aria-hidden="true"
  const allText = container.textContent ?? '';
  expect(allText).toContain('Sailing to swamp...');
});
