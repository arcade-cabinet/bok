import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { PrivacyPolicy } from './PrivacyPolicy';

test('renders privacy policy heading', async () => {
  await render(<PrivacyPolicy onClose={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'PRIVACY POLICY' })).toBeVisible();
});

test('shows policy sections', async () => {
  await render(<PrivacyPolicy onClose={() => {}} />);

  await expect.element(page.getByText('Data Collection')).toBeInTheDocument();
  await expect.element(page.getByText('Local Storage')).toBeInTheDocument();
  await expect.element(page.getByText('Analytics (Optional)')).toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
});

test('shows close button', async () => {
  await render(<PrivacyPolicy onClose={() => {}} />);

  await expect.element(page.getByText('Close')).toBeVisible();
});
