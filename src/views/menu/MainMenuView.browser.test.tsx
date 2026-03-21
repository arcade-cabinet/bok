import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MainMenuView } from './MainMenuView';

test('renders title and menu buttons', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await expect
    .element(screen.getByRole('heading', { name: 'BOK' }))
    .toBeVisible();

  await expect
    .element(screen.getByRole('button', { name: /Pen New Tale/ }))
    .toBeVisible();
});
