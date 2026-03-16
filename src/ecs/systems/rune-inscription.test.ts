import { describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { ChiselState, Hotbar, MiningState, RuneFaces } from "../traits/index.ts";
import { CHISEL_ITEM_ID, Face, RuneId } from "./rune-data.ts";
import type { FaceHit, RuneInscriptionEffects } from "./rune-inscription.ts";
import { getRuneOnFace, placeRune, runeInscriptionSystem } from "./rune-inscription.ts";

const noopEffects: RuneInscriptionEffects = {
	spawnParticles: vi.fn(),
};

function makeFaceHit(bx: number, by: number, bz: number, px: number, py: number, pz: number): FaceHit {
	return { blockX: bx, blockY: by, blockZ: bz, prevX: px, prevY: py, prevZ: pz };
}

describe("rune-inscription", () => {
	describe("runeInscriptionSystem", () => {
		it("sets chisel.active when holding chisel", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			// Put chisel in active slot
			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
				hotbar.activeSlot = 0;
			});

			runeInscriptionSystem(world, 0.016, null, noopEffects);

			const chisel = player.get(ChiselState);
			expect(chisel?.active).toBe(true);
		});

		it("clears chisel.active when not holding chisel", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			// Default hotbar has wood block in slot 0
			runeInscriptionSystem(world, 0.016, null, noopEffects);

			const chisel = player.get(ChiselState);
			expect(chisel?.active).toBe(false);
		});

		it("intercepts mining when chisel is active", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			// Equip chisel
			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
				hotbar.activeSlot = 0;
			});

			// Simulate mining active
			world.query(MiningState).updateEach(([mining]) => {
				mining.active = true;
			});

			// Face hit: block at (5,10,15), prev at (6,10,15) → PosX face
			const faceHit = makeFaceHit(5, 10, 15, 6, 10, 15);
			runeInscriptionSystem(world, 0.016, faceHit, noopEffects);

			// Mining should be intercepted
			const mining = player.get(MiningState);
			expect(mining?.active).toBe(false);
			expect(mining?.progress).toBe(0);

			// Chisel should have selected the face
			const chisel = player.get(ChiselState);
			expect(chisel?.selectedFace).toBe(Face.PosX);
			expect(chisel?.selectedX).toBe(5);
			expect(chisel?.selectedY).toBe(10);
			expect(chisel?.selectedZ).toBe(15);
			expect(chisel?.wheelOpen).toBe(true);
		});

		it("does not intercept mining without chisel", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			// Default hotbar (wood block, not chisel)
			world.query(MiningState).updateEach(([mining]) => {
				mining.active = true;
			});

			const faceHit = makeFaceHit(5, 10, 15, 6, 10, 15);
			runeInscriptionSystem(world, 0.016, faceHit, noopEffects);

			// Mining should remain active
			const mining = player.get(MiningState);
			expect(mining?.active).toBe(true);
		});
	});

	describe("placeRune", () => {
		it("places a rune on a face", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			// Equip chisel
			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
				hotbar.activeSlot = 0;
			});

			const result = placeRune(world, 5, 10, 15, Face.PosX, RuneId.Fehu, noopEffects);
			expect(result).toBe(true);

			const runeFaces = player.get(RuneFaces);
			expect(runeFaces?.faces["5,10,15"]?.[Face.PosX]).toBe(RuneId.Fehu);
		});

		it("closes the wheel after placement", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
				hotbar.activeSlot = 0;
			});

			// Open the wheel first
			world.query(ChiselState).updateEach(([chisel]) => {
				chisel.wheelOpen = true;
				chisel.selectedFace = Face.PosX;
			});

			placeRune(world, 5, 10, 15, Face.PosX, RuneId.Fehu, noopEffects);

			const chisel = player.get(ChiselState);
			expect(chisel?.wheelOpen).toBe(false);
			expect(chisel?.selectedFace).toBe(-1);
		});

		it("drains chisel durability", () => {
			const world = createTestWorld();
			spawnPlayer(world);

			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 2 };
				hotbar.activeSlot = 0;
			});

			placeRune(world, 5, 10, 15, Face.PosX, RuneId.Fehu, noopEffects);

			// Durability should decrease by 1
			let durability = 0;
			world.query(Hotbar).readEach(([hotbar]) => {
				const slot = hotbar.slots[0];
				durability = slot && slot.type === "item" ? (slot.durability ?? 0) : 0;
			});
			expect(durability).toBe(1);
		});

		it("breaks chisel when durability reaches 0", () => {
			const world = createTestWorld();
			spawnPlayer(world);

			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 1 };
				hotbar.activeSlot = 0;
			});

			placeRune(world, 5, 10, 15, Face.PosX, RuneId.Fehu, noopEffects);

			let slot: unknown = "notNull";
			world.query(Hotbar).readEach(([hotbar]) => {
				slot = hotbar.slots[0];
			});
			expect(slot).toBeNull();
		});

		it("can place different runes on different faces of same block", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);

			world.query(Hotbar).updateEach(([hotbar]) => {
				hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
				hotbar.activeSlot = 0;
			});

			placeRune(world, 5, 10, 15, Face.PosX, RuneId.Fehu, noopEffects);
			placeRune(world, 5, 10, 15, Face.NegY, RuneId.Algiz, noopEffects);

			const runeFaces = player.get(RuneFaces);
			expect(runeFaces?.faces["5,10,15"]?.[Face.PosX]).toBe(RuneId.Fehu);
			expect(runeFaces?.faces["5,10,15"]?.[Face.NegY]).toBe(RuneId.Algiz);
		});
	});

	describe("getRuneOnFace", () => {
		it("returns 0 for blank face", () => {
			expect(getRuneOnFace({ faces: {} }, 5, 10, 15, Face.PosX)).toBe(0);
		});

		it("returns rune ID for inscribed face", () => {
			const faces = { "5,10,15": [RuneId.Fehu, 0, 0, 0, 0, 0] };
			expect(getRuneOnFace({ faces }, 5, 10, 15, Face.PosX)).toBe(RuneId.Fehu);
		});

		it("returns 0 for uninscribed face of inscribed block", () => {
			const faces = { "5,10,15": [RuneId.Fehu, 0, 0, 0, 0, 0] };
			expect(getRuneOnFace({ faces }, 5, 10, 15, Face.NegX)).toBe(0);
		});
	});
});
