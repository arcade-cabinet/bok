import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import type { DamageNumber } from './DamageNumbers';
import { DamageNumbers } from './DamageNumbers';

test('renders damage numbers at screen positions', async () => {
  const numbers: DamageNumber[] = [
    { id: 1, value: 25, x: 50, y: 30, timestamp: Date.now() },
    { id: 2, value: 42, x: 70, y: 60, timestamp: Date.now() },
  ];

  const { container } = await render(<DamageNumbers numbers={numbers} />);

  // Both damage values should be rendered
  const texts = container.querySelectorAll('.absolute');
  const values = Array.from(texts).map((el) => el.textContent);
  expect(values).toContain('25');
  expect(values).toContain('42');

  // Check positioning via style attributes
  const first = container.querySelector('[style*="left: 50%"]');
  expect(first).not.toBeNull();
  const second = container.querySelector('[style*="left: 70%"]');
  expect(second).not.toBeNull();
});

test('renders empty overlay when numbers array is empty', async () => {
  const { container } = await render(<DamageNumbers numbers={[]} />);

  // Container div exists but has no damage number children
  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper).not.toBeNull();
  expect(wrapper.getAttribute('aria-hidden')).toBe('true');
  expect(wrapper.querySelectorAll('.absolute').length).toBe(0);
});
