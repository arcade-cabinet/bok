/**
 * @module inventory
 * @role Item inventory, loot drops, and crafting
 * @input Item add/remove operations, drop configs, crafting recipes
 * @output Inventory state queries, loot roll results, crafted items
 * @depends None (standalone data structures)
 * @tested Inventory.test.ts
 */
export { Inventory, type ItemStack } from './Inventory.ts';
export { LootTable, type DropConfig, type DropResult } from './LootTable.ts';
export { CraftingSystem, type Recipe } from './CraftingSystem.ts';
