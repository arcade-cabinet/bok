import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { PauseMenu } from './PauseMenu';

test('renders PAUSED heading', async () => {
  await render(<PauseMenu onResume={() => {}} onAbandonRun={() => {}} onQuitToMenu={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'PAUSED' })).toBeVisible();
});

test('shows all 4 buttons', async () => {
  await render(<PauseMenu onResume={() => {}} onAbandonRun={() => {}} onQuitToMenu={() => {}} />);

  await expect.element(page.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Abandon Run' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Quit to Menu' })).toBeInTheDocument();
});

test('Resume button calls onResume when clicked', async () => {
  const onResume = vi.fn();
  await render(<PauseMenu onResume={onResume} onAbandonRun={() => {}} onQuitToMenu={() => {}} />);

  await page.getByRole('button', { name: 'Resume' }).click();

  expect(onResume).toHaveBeenCalledOnce();
});

test('Abandon Run button calls onAbandonRun when clicked', async () => {
  const onAbandonRun = vi.fn();
  await render(<PauseMenu onResume={() => {}} onAbandonRun={onAbandonRun} onQuitToMenu={() => {}} />);

  await page.getByRole('button', { name: 'Abandon Run' }).click();

  expect(onAbandonRun).toHaveBeenCalledOnce();
});

test('Quit to Menu button calls onQuitToMenu when clicked', async () => {
  const onQuitToMenu = vi.fn();
  await render(<PauseMenu onResume={() => {}} onAbandonRun={() => {}} onQuitToMenu={onQuitToMenu} />);

  await page.getByRole('button', { name: 'Quit to Menu' }).click();

  expect(onQuitToMenu).toHaveBeenCalledOnce();
});

test('Settings button is enabled and clickable', async () => {
  await render(<PauseMenu onResume={() => {}} onAbandonRun={() => {}} onQuitToMenu={() => {}} />);

  const settingsBtn = page.getByRole('button', { name: 'Settings' });
  await expect.element(settingsBtn).toBeVisible();
  // Settings button should be interactive (not disabled)
  await settingsBtn.click();
});
