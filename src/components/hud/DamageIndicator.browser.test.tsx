import { createRef } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { DamageIndicator, type DamageIndicatorHandle } from './DamageIndicator';

test('mounts without crashing and renders a container div', async () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { container } = await render(
    <DamageIndicator ref={createRef<DamageIndicatorHandle>()} canvasRef={canvasRef} />,
  );

  const overlay = container.firstElementChild as HTMLElement;
  expect(overlay).not.toBeNull();
  expect(overlay.tagName).toBe('DIV');
  expect(overlay.getAttribute('aria-hidden')).toBe('true');
});

test('overlay has pointer-events-none and fixed positioning', async () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { container } = await render(
    <DamageIndicator ref={createRef<DamageIndicatorHandle>()} canvasRef={canvasRef} />,
  );

  const overlay = container.firstElementChild as HTMLElement;
  expect(overlay.className).toContain('pointer-events-none');
  expect(overlay.className).toContain('fixed');
  expect(overlay.className).toContain('inset-0');
});
