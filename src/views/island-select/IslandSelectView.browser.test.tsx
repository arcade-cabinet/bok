import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { IslandSelectView } from './IslandSelectView';

/** All biomes unlocked for testing purposes. */
const ALL_BIOMES = ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'];

test('renders all 8 biome cards when all unlocked', async () => {
  const screen = await render(
    <IslandSelectView onSelectBiome={() => {}} onCancel={() => {}} unlockedBiomes={ALL_BIOMES} />,
  );

  // Header
  await expect.element(screen.getByText('Choose Your Destination')).toBeVisible();
  await expect.element(screen.getByText('The winds await your command, Captain.')).toBeVisible();

  // All 8 biome names visible
  const biomeNames = [
    'Whispering Woods',
    'Sunscorched Dunes',
    'Frostbite Expanse',
    'Cinderpeak Caldera',
    'Rothollow Marsh',
    'Prismatic Depths',
    'Stormspire Remnants',
    'Abyssal Trench',
  ];
  for (const name of biomeNames) {
    await expect.element(screen.getByText(name)).toBeInTheDocument();
  }
});

test('selecting a biome highlights it and enables Set Sail', async () => {
  const onSelectBiome = vi.fn();
  await render(<IslandSelectView onSelectBiome={onSelectBiome} onCancel={() => {}} unlockedBiomes={ALL_BIOMES} />);

  // Set Sail starts disabled
  const setSailBtn = page.getByTestId('set-sail-btn');
  await expect.element(setSailBtn).toBeVisible();

  // Click a biome card
  const forestCard = page.getByTestId('biome-card-forest');
  await forestCard.click();

  // Now click Set Sail
  await setSailBtn.click();
  expect(onSelectBiome).toHaveBeenCalledWith('forest');
});

test('clicking Back to Hub calls onCancel', async () => {
  const onCancel = vi.fn();
  await render(<IslandSelectView onSelectBiome={() => {}} onCancel={onCancel} unlockedBiomes={ALL_BIOMES} />);

  await page.getByRole('button', { name: /Back to Hub/ }).click();
  expect(onCancel).toHaveBeenCalled();
});

test('biome cards have data-testid attributes for each biome', async () => {
  await render(<IslandSelectView onSelectBiome={() => {}} onCancel={() => {}} unlockedBiomes={ALL_BIOMES} />);

  for (const id of ALL_BIOMES) {
    await expect.element(page.getByTestId(`biome-card-${id}`)).toBeInTheDocument();
  }
});

test('selecting different biomes updates the highlight', async () => {
  const onSelectBiome = vi.fn();
  await render(<IslandSelectView onSelectBiome={onSelectBiome} onCancel={() => {}} unlockedBiomes={ALL_BIOMES} />);

  // Select forest
  await page.getByTestId('biome-card-forest').click();
  // Select desert (should deselect forest)
  await page.getByTestId('biome-card-desert').click();

  // Click Set Sail — should call with desert
  await page.getByTestId('set-sail-btn').click();
  expect(onSelectBiome).toHaveBeenCalledWith('desert');
  expect(onSelectBiome).toHaveBeenCalledTimes(1);
});

test('only forest is available with no unlocked biomes', async () => {
  await render(<IslandSelectView onSelectBiome={() => {}} onCancel={() => {}} />);

  // Forest always available
  await expect.element(page.getByTestId('biome-card-forest')).toBeInTheDocument();

  // Other biomes should be locked
  await expect.element(page.getByTestId('biome-card-desert-locked')).toBeInTheDocument();
});
