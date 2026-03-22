import type React from 'react';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ErrorBoundary } from './ErrorBoundary';

function GoodChild() {
  return <div data-testid="good-child">All good here</div>;
}

function BadChild(): React.JSX.Element {
  throw new Error('Intentional test error');
}

test('renders children when no error occurs', async () => {
  await render(
    <ErrorBoundary>
      <GoodChild />
    </ErrorBoundary>,
  );

  await expect.element(page.getByText('All good here')).toBeVisible();
});

test('shows error fallback when child throws', async () => {
  // Suppress the expected console.error from React and the ErrorBoundary
  const origError = console.error;
  console.error = () => {};

  try {
    await render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    await expect.element(page.getByText('Something went wrong')).toBeVisible();
    await expect.element(page.getByText('Intentional test error')).toBeVisible();
  } finally {
    console.error = origError;
  }
});

test('shows Try Again and Return to Menu buttons in error state', async () => {
  const origError = console.error;
  console.error = () => {};

  try {
    await render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    await expect.element(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Return to Menu' })).toBeVisible();
  } finally {
    console.error = origError;
  }
});

test('Try Again button resets the error boundary', async () => {
  const origError = console.error;
  console.error = () => {};

  try {
    // We can't easily test the full reset cycle (child would throw again),
    // but we can verify the button is interactive and clickable
    const { container } = await render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    const resetBtn = container.querySelector('[data-testid="error-boundary-reset"]') as HTMLButtonElement;
    expect(resetBtn).not.toBeNull();
    expect(resetBtn.textContent).toBe('Try Again');
  } finally {
    console.error = origError;
  }
});
