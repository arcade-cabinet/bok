import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ActionButtons } from './ActionButtons';

test('renders attack button', async () => {
  await render(<ActionButtons onAttack={() => {}} onDodge={() => {}} />);

  await expect.element(page.getByRole('button', { name: 'Attack' })).toBeVisible();
});

test('renders dodge button', async () => {
  await render(<ActionButtons onAttack={() => {}} onDodge={() => {}} />);

  await expect.element(page.getByRole('button', { name: 'Dodge' })).toBeVisible();
});

test('renders jump button', async () => {
  await render(<ActionButtons onAttack={() => {}} onDodge={() => {}} />);

  await expect.element(page.getByRole('button', { name: 'Jump' })).toBeVisible();
});

test('renders shape cycle button with shape name', async () => {
  await render(<ActionButtons onAttack={() => {}} onDodge={() => {}} currentShapeName="Ramp" />);

  await expect.element(page.getByRole('button', { name: /Cycle Shape \(current: Ramp\)/ })).toBeVisible();
  await expect.element(page.getByText('Ramp')).toBeInTheDocument();
});
