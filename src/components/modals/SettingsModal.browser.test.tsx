import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SettingsModal } from './SettingsModal';

test('renders Settings heading', async () => {
  await render(<SettingsModal onClose={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('shows quality preset buttons', async () => {
  await render(<SettingsModal onClose={() => {}} />);

  await expect.element(page.getByRole('button', { name: 'Low' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'High' })).toBeInTheDocument();
});

test('shows feature toggle switches', async () => {
  await render(<SettingsModal onClose={() => {}} />);

  await expect.element(page.getByText('Shadows')).toBeInTheDocument();
  await expect.element(page.getByText('Day/Night Cycle')).toBeInTheDocument();
  await expect.element(page.getByText('Weather Effects')).toBeInTheDocument();
  await expect.element(page.getByText('Post Processing')).toBeInTheDocument();
});

test('shows audio volume sliders', async () => {
  await render(<SettingsModal onClose={() => {}} />);

  await expect.element(page.getByText('Master Volume')).toBeInTheDocument();
  await expect.element(page.getByText('SFX Volume')).toBeInTheDocument();
  await expect.element(page.getByText('Music Volume')).toBeInTheDocument();
});

test('Apply button calls onClose', async () => {
  const onClose = vi.fn();
  await render(<SettingsModal onClose={onClose} />);

  await page.getByRole('button', { name: 'Apply' }).click();

  expect(onClose).toHaveBeenCalledOnce();
});
