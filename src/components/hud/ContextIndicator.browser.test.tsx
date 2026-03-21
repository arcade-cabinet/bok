import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ContextIndicator } from './ContextIndicator';

test('combat context renders red glow overlay', async () => {
  const { container } = await render(<ContextIndicator context="combat" />);

  // The combat overlay has an inset box-shadow with red tones.
  // Framer motion animates opacity, so wait for it to appear.
  await expect.element(page.elementLocator(container.querySelector('[style*="box-shadow"]')!)).toBeInTheDocument();
});

test('explore context renders no visual indicator', async () => {
  const { container } = await render(<ContextIndicator context="explore" />);

  // Allow AnimatePresence to settle
  await new Promise((r) => setTimeout(r, 100));

  // No combat glow — no child divs with box-shadow
  const glowEl = container.querySelector('[style*="box-shadow"]');
  expect(glowEl).toBeNull();

  // No climb/drop SVG arrows
  const svgs = container.querySelectorAll('svg');
  expect(svgs.length).toBe(0);
});
