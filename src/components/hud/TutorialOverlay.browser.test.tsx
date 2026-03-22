import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TutorialOverlay } from './TutorialOverlay';

test('renders first step title and text', async () => {
  await render(<TutorialOverlay onComplete={() => {}} />);

  await expect.element(page.getByText('Welcome to Bok!')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Next' })).toBeVisible();
});

test('Next button advances to the next step', async () => {
  await render(<TutorialOverlay onComplete={() => {}} />);

  await page.getByRole('button', { name: 'Next' }).click();

  // Second step title is "Movement"
  await expect.element(page.getByText('Movement')).toBeVisible();
});

test('Skip Tutorial button calls onComplete', async () => {
  const onComplete = vi.fn();
  await render(<TutorialOverlay onComplete={onComplete} />);

  await page.getByRole('button', { name: 'Skip Tutorial' }).click();

  expect(onComplete).toHaveBeenCalledOnce();
});

test('renders step indicator dots', async () => {
  const { container } = await render(<TutorialOverlay onComplete={() => {}} />);

  // There are 6 tutorial steps, so 6 dots
  const dots = container.querySelectorAll('[data-testid^="step-dot-"]');
  expect(dots.length).toBe(6);
});

test('last step shows Start Playing instead of Next', async () => {
  await render(<TutorialOverlay onComplete={() => {}} />);

  // Click Next 5 times to reach the last step (6 total steps, starting at 0)
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }

  // Last step should show "Hub" title and "Start Playing" button
  await expect.element(page.getByTestId('tutorial-title')).toHaveTextContent('Hub');
  await expect.element(page.getByRole('button', { name: 'Start Playing' })).toBeVisible();
});
