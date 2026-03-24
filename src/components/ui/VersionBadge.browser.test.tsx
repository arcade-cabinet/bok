import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { VersionBadge } from './VersionBadge';

test('renders version number', async () => {
  await render(<VersionBadge />);

  await expect.element(page.getByText('v0.2.0')).toBeVisible();
});
