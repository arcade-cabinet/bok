import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { TouchControls } from './TouchControls';

test('renders nothing visually (returns null) when enabled', async () => {
  const onOutput = vi.fn();
  const { container } = await render(<TouchControls onOutput={onOutput} enabled={true} />);

  // TouchControls returns null — no DOM output
  expect(container.innerHTML).toBe('');
});

test('renders nothing visually when disabled', async () => {
  const onOutput = vi.fn();
  const { container } = await render(<TouchControls onOutput={onOutput} enabled={false} />);

  expect(container.innerHTML).toBe('');
});

test('mounts without crashing regardless of enabled state', async () => {
  const onOutput = vi.fn();

  // Enabled
  const r1 = await render(<TouchControls onOutput={onOutput} enabled={true} />);
  expect(r1.container).toBeTruthy();

  // Disabled
  const r2 = await render(<TouchControls onOutput={onOutput} enabled={false} />);
  expect(r2.container).toBeTruthy();
});
