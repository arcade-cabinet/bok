import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { HealthBar } from './HealthBar';

test('renders health text showing current / max values', async () => {
  await render(<HealthBar current={75} max={100} />);

  await expect.element(page.getByText('75 / 100')).toBeInTheDocument();
  await expect.element(page.getByText('Health')).toBeInTheDocument();
});

test('progress bar has correct value and max attributes', async () => {
  const { container } = await render(<HealthBar current={60} max={100} />);

  const progress = container.querySelector('progress');
  expect(progress).not.toBeNull();
  expect(progress?.getAttribute('value')).toBe('60');
  expect(progress?.getAttribute('max')).toBe('100');
});

test('low health triggers pulse animation class', async () => {
  const { container } = await render(<HealthBar current={15} max={100} />);

  // 15/100 = 0.15, which is below the 0.2 threshold
  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper.className).toContain('animate-[health-pulse_600ms_ease-in-out_infinite]');
});

test('full health does not have pulse animation class', async () => {
  const { container } = await render(<HealthBar current={100} max={100} />);

  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper.className).not.toContain('animate-[health-pulse_600ms_ease-in-out_infinite]');
});

test('zero max health handles gracefully without division by zero', async () => {
  const { container } = await render(<HealthBar current={0} max={0} />);

  // ratio = 0 when max is 0, so no pulse (0 < 0.2 is true, but the guard sets ratio to 0)
  // Actually 0 < 0.2 is true, so pulse IS applied
  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper.className).toContain('animate-[health-pulse_600ms_ease-in-out_infinite]');

  // Should render "0 / 0" without crashing
  await expect.element(page.getByText('0 / 0')).toBeInTheDocument();
});
