import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { NPCEntity } from '../../engine/npcEntities';
import { NPCDialogue } from './NPCDialogue';

/** Minimal NPC entity that satisfies the component's runtime needs (type imports only). */
function makeMerchantNpc(): NPCEntity {
  return {
    id: 'npc-merchant-1',
    name: 'Greta the Trader',
    role: 'merchant' as const,
    worldPos: { x: 0, y: 0, z: 0 } as unknown as NPCEntity['worldPos'],
    mesh: {} as never,
    dialogue: { greeting: 'Welcome, traveler!', farewell: 'Safe journeys.' },
    inventory: [
      { itemId: 'health-potion', basePrice: 25 },
      { itemId: 'torch', basePrice: 10 },
    ],
    requiredBuilding: null,
  };
}

function makeLoreNpc(): NPCEntity {
  return {
    id: 'npc-lore-1',
    name: 'Elder Miriam',
    role: 'lore' as const,
    worldPos: { x: 0, y: 0, z: 0 } as unknown as NPCEntity['worldPos'],
    mesh: {} as never,
    dialogue: { greeting: 'Ah, the seeker of knowledge arrives.', farewell: 'May the pages guide you.' },
    inventory: [],
    requiredBuilding: null,
  };
}

const noopHandlers = {
  onBuy: () => {},
  onCraft: () => {},
  onSelectDestination: () => {},
  onClose: () => {},
  craftingRecipes: [],
  unlockedPages: [],
  biomeDestinations: [],
};

test('renders NPC name and role badge', async () => {
  await render(<NPCDialogue npc={makeMerchantNpc()} {...noopHandlers} />);

  await expect.element(page.getByText('Greta the Trader')).toBeVisible();
  await expect.element(page.getByText('merchant')).toBeInTheDocument();
});

test('shows greeting dialogue', async () => {
  await render(<NPCDialogue npc={makeMerchantNpc()} {...noopHandlers} />);

  await expect.element(page.getByText(/Welcome, traveler!/)).toBeVisible();
});

test('close button calls onClose', async () => {
  const onClose = vi.fn();
  await render(<NPCDialogue npc={makeMerchantNpc()} {...noopHandlers} onClose={onClose} />);

  await page.getByRole('button', { name: 'Close dialogue' }).click();

  expect(onClose).toHaveBeenCalledOnce();
});

test('merchant NPC shows wares with buy buttons', async () => {
  await render(<NPCDialogue npc={makeMerchantNpc()} {...noopHandlers} />);

  await expect.element(page.getByText('Wares')).toBeInTheDocument();
  await expect.element(page.getByText('Health Potion')).toBeInTheDocument();
  await expect.element(page.getByText('Torch')).toBeInTheDocument();
});

test('lore NPC shows collected pages message when none unlocked', async () => {
  await render(<NPCDialogue npc={makeLoreNpc()} {...noopHandlers} />);

  await expect.element(page.getByText(/not yet discovered any tome pages/)).toBeInTheDocument();
});
