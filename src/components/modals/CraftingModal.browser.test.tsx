import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { CraftingRecipeConfig } from '../../content/types';
import { CraftingModal } from './CraftingModal';

const PLANKS_RECIPE: CraftingRecipeConfig = {
  id: 'wooden-planks',
  name: 'Wooden Planks',
  category: 'basic',
  tier: 1,
  ingredients: [{ itemId: 'wood', amount: 3 }],
  output: { itemId: 'wooden-planks', amount: 4 },
};

const IRON_SWORD_RECIPE: CraftingRecipeConfig = {
  id: 'iron-sword-recipe',
  name: 'Iron Sword',
  category: 'weapon',
  tier: 2,
  ingredients: [
    { itemId: 'iron-ore', amount: 5 },
    { itemId: 'wood', amount: 2 },
  ],
  output: { itemId: 'iron-sword', amount: 1 },
};

const HEALTH_POTION_RECIPE: CraftingRecipeConfig = {
  id: 'health-potion',
  name: 'Health Potion',
  category: 'consumable',
  tier: 1,
  ingredients: [{ itemId: 'herb', amount: 3 }],
  output: { itemId: 'health-potion', amount: 1 },
};

test('renders The Forge heading and category headings', async () => {
  const recipes = [PLANKS_RECIPE, IRON_SWORD_RECIPE, HEALTH_POTION_RECIPE];
  const resources = { wood: 10, 'iron-ore': 3, herb: 5 };

  const screen = await render(
    <CraftingModal recipes={recipes} resources={resources} onCraft={() => {}} onClose={() => {}} />,
  );

  await expect.element(screen.getByText('The Forge')).toBeVisible();
  await expect.element(screen.getByText('Building Materials')).toBeVisible();
  await expect.element(screen.getByText('Weapons')).toBeVisible();
  await expect.element(screen.getByText('Consumables')).toBeVisible();
});

test('renders output descriptions for each recipe', async () => {
  const recipes = [PLANKS_RECIPE, IRON_SWORD_RECIPE, HEALTH_POTION_RECIPE];
  const resources = {};

  const screen = await render(
    <CraftingModal recipes={recipes} resources={resources} onCraft={() => {}} onClose={() => {}} />,
  );

  await expect.element(screen.getByText('Produces: 4x Wooden Planks')).toBeInTheDocument();
  await expect.element(screen.getByText('Produces: 1x Iron Sword')).toBeInTheDocument();
  await expect.element(screen.getByText('Produces: 1x Health Potion')).toBeInTheDocument();
});

test('Craft button is enabled when player can afford recipe', async () => {
  const recipes = [PLANKS_RECIPE];
  const resources = { wood: 10 };
  const onCraft = vi.fn();

  await render(<CraftingModal recipes={recipes} resources={resources} onCraft={onCraft} onClose={() => {}} />);

  const craftBtn = page.getByTestId('craft-wooden-planks');
  await craftBtn.click();
  expect(onCraft).toHaveBeenCalledWith('wooden-planks');
});

test('Craft button is disabled when player cannot afford recipe', async () => {
  const recipes = [IRON_SWORD_RECIPE];
  const resources = { 'iron-ore': 2, wood: 1 }; // Not enough
  const onCraft = vi.fn();

  await render(<CraftingModal recipes={recipes} resources={resources} onCraft={onCraft} onClose={() => {}} />);

  const craftBtn = page.getByTestId('craft-iron-sword-recipe');
  await craftBtn.click();
  // Should not fire since button is disabled
  expect(onCraft).not.toHaveBeenCalled();
});

test('shows ingredient counts with have/need format', async () => {
  const recipes = [IRON_SWORD_RECIPE];
  const resources = { 'iron-ore': 2, wood: 5 };

  const screen = await render(
    <CraftingModal recipes={recipes} resources={resources} onCraft={() => {}} onClose={() => {}} />,
  );

  // Ingredient badges show "ItemName: have/need"
  await expect.element(screen.getByText('Iron Ore: 2/5')).toBeInTheDocument();
  await expect.element(screen.getByText('Wood: 5/2')).toBeInTheDocument();
});

test('empty recipes shows "No recipes available" message', async () => {
  const screen = await render(<CraftingModal recipes={[]} resources={{}} onCraft={() => {}} onClose={() => {}} />);

  await expect.element(screen.getByText('No recipes available yet.')).toBeVisible();
});

test('Close button calls onClose', async () => {
  const onClose = vi.fn();
  await render(<CraftingModal recipes={[]} resources={{}} onCraft={() => {}} onClose={onClose} />);

  await page.getByRole('button', { name: 'Close' }).click();
  expect(onClose).toHaveBeenCalled();
});

test('three craft buttons present for three recipes', async () => {
  const recipes = [PLANKS_RECIPE, IRON_SWORD_RECIPE, HEALTH_POTION_RECIPE];
  const resources = {};

  await render(<CraftingModal recipes={recipes} resources={resources} onCraft={() => {}} onClose={() => {}} />);

  await expect.element(page.getByTestId('craft-wooden-planks')).toBeInTheDocument();
  await expect.element(page.getByTestId('craft-iron-sword-recipe')).toBeInTheDocument();
  await expect.element(page.getByTestId('craft-health-potion')).toBeInTheDocument();
});
