import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { GameSettingsPanel } from './GameSettingsPanel';

test('renders Gameplay heading', async () => {
  await render(<GameSettingsPanel onOpenPrivacyPolicy={() => {}} />);

  await expect.element(page.getByText('Gameplay')).toBeVisible();
});

test('shows toggle options with descriptions', async () => {
  await render(<GameSettingsPanel onOpenPrivacyPolicy={() => {}} />);

  await expect.element(page.getByText('Player Governor (GOAP)')).toBeInTheDocument();
  await expect.element(page.getByText('Auto-Target')).toBeInTheDocument();
  await expect.element(page.getByText('Screen Shake')).toBeInTheDocument();
  await expect.element(page.getByText('Damage Numbers', { exact: true })).toBeInTheDocument();
});

test('shows Privacy & Analytics section with policy link', async () => {
  await render(<GameSettingsPanel onOpenPrivacyPolicy={() => {}} />);

  await expect.element(page.getByText('Privacy & Analytics')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'View Privacy Policy' })).toBeInTheDocument();
});
