import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { GoalProgress } from '../../engine/goalSystem';
import { GoalTracker } from './GoalTracker';

function makeGoal(overrides: Partial<GoalProgress> & { id: string; title: string }): GoalProgress {
  return {
    definition: {
      id: overrides.id,
      title: overrides.title,
      description: '',
      type: 'kill',
      target: overrides.definition?.target ?? 5,
      icon: overrides.definition?.icon ?? '⚔',
    },
    current: overrides.current ?? 0,
    completed: overrides.completed ?? false,
  };
}

test('renders goal items with titles and progress', async () => {
  const goals: GoalProgress[] = [
    makeGoal({ id: 'g1', title: 'Defeat Skeletons', current: 2 }),
    makeGoal({ id: 'g2', title: 'Gather Wood', current: 4 }),
  ];

  await render(<GoalTracker goals={goals} bossUnlocked={false} completionMessage="" />);

  await expect.element(page.getByText('Objectives')).toBeInTheDocument();
  await expect.element(page.getByText('Defeat Skeletons')).toBeInTheDocument();
  await expect.element(page.getByText('Gather Wood')).toBeInTheDocument();
  await expect.element(page.getByText('2/5')).toBeInTheDocument();
  await expect.element(page.getByText('4/5')).toBeInTheDocument();
});

test('completed goals have line-through class', async () => {
  const goals: GoalProgress[] = [makeGoal({ id: 'g1', title: 'Defeat Skeletons', current: 5, completed: true })];

  const { container } = await render(<GoalTracker goals={goals} bossUnlocked={false} completionMessage="" />);

  const goalEl = container.querySelector('.line-through');
  expect(goalEl).not.toBeNull();
  expect(goalEl?.textContent).toContain('Defeat Skeletons');
});

test('shows completion message when boss is unlocked', async () => {
  const goals: GoalProgress[] = [makeGoal({ id: 'g1', title: 'Defeat Skeletons', current: 5, completed: true })];

  await render(<GoalTracker goals={goals} bossUnlocked={true} completionMessage="The guardian awakens..." />);

  await expect.element(page.getByText('The guardian awakens...')).toBeInTheDocument();
});

test('returns null when goals array is empty', async () => {
  const { container } = await render(<GoalTracker goals={[]} bossUnlocked={false} completionMessage="" />);

  expect(container.innerHTML).toBe('');
});
