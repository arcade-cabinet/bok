import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { BlockVignette } from './BlockVignette';

test('renders overlay with full opacity when isBlocking is true', async () => {
  const { container } = await render(<BlockVignette isBlocking={true} />);

  const overlay = container.firstElementChild as HTMLElement;
  expect(overlay).not.toBeNull();
  expect(overlay.style.opacity).toBe('1');
  expect(overlay.getAttribute('aria-hidden')).toBe('true');
});

test('renders overlay with zero opacity when isBlocking is false', async () => {
  const { container } = await render(<BlockVignette isBlocking={false} />);

  const overlay = container.firstElementChild as HTMLElement;
  expect(overlay).not.toBeNull();
  expect(overlay.style.opacity).toBe('0');
});
