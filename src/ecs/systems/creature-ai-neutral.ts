/**
 * Neutral/boss creature AI dispatch — Vittra, Nacken, Jatten.
 * Handles neutral archetype behavior tree and debuff application.
 */

import type { World } from "koota";
import { cosmeticRng } from "../../world/noise.ts";
import {
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	Health,
	Hunger,
	PlayerState,
	PlayerTag,
	Position,
	Species,
} from "../traits/index.ts";
import type { CreatureEffects, CreatureUpdateContext } from "./creature-ai.ts";
import { cleanupCreatureState } from "./creature-ai.ts";
import { updateJattenAI } from "./creature-ai-jatten.ts";
import { updateNackenAI } from "./creature-ai-nacken.ts";
import { updateVittraAI } from "./creature-ai-vittra.ts";
import { OTUR_HUNGER_MULT } from "./vittra-debuff.ts";

const GRAVITY = 28;

/** Run neutral/boss AI: Vittra debuff/appease, Nacken disorientation, Jatten boss. */
export function updateNeutralAI(world: World, dt: number, ctx: CreatureUpdateContext, effects?: CreatureEffects) {
	const otur = () => applyOturDebuff(world);
	const disorient = (dur: number) => applyDisorientation(world, dur);
	const dmg = (damage: number) => applyDamageToPlayer(world, damage);
	const noopTerrain = () => false;

	world
		.query(CreatureTag, CreatureAI, CreatureHealth, CreatureAnimation, CreatureType, Position)
		.updateEach(([ai, hp, anim, cType, pos], entity) => {
			if (ai.aiType !== "neutral" && ai.aiType !== "boss") return;

			if (cType.species === Species.Vittra) {
				updateVittraAI(pos, ai, hp, anim, entity.id(), dt, ctx, otur, effects);
			} else if (cType.species === Species.Nacken) {
				updateNackenAI(pos, ai, hp, anim, entity.id(), dt, ctx, disorient, effects);
			} else if (cType.species === Species.Jatten) {
				updateJattenAI(pos, ai, hp, anim, entity.id(), dt, ctx, applyGravity, dmg, noopTerrain, effects);
			}

			if (hp.hp <= 0) {
				cleanupCreatureState(entity.id());
				effects?.spawnParticles(pos.x, pos.y, pos.z, 0x6b6b6b, 20);
				effects?.onCreatureDied(entity.id());
				entity.destroy();
			}
		});
}

// ─── Debuff Helpers ───

import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";

function applyGravity(hp: { velY: number }, pos: { x: number; y: number; z: number }, dt: number) {
	hp.velY -= GRAVITY * dt;
	pos.y += hp.velY * dt;
	const feetX = Math.floor(pos.x);
	const feetZ = Math.floor(pos.z);
	const feetY = Math.floor(pos.y - 1);
	if (feetY >= 0) {
		const below = getVoxelAt(feetX, feetY, feetZ);
		if (below > 0 && isBlockSolid(below)) {
			pos.y = feetY + 1;
			hp.velY = 0;
		}
	}
	if (pos.y < 0) {
		pos.y = 0;
		hp.velY = 0;
	}
}

function applyOturDebuff(world: World) {
	world.query(PlayerTag, Hunger).updateEach(([hunger]) => {
		hunger.decayRate = Math.min(hunger.decayRate * OTUR_HUNGER_MULT, 2.0);
	});
}

function applyDisorientation(world: World, _duration: number) {
	world.query(PlayerTag, PlayerState).updateEach(([state]) => {
		state.shakeX = 0.15;
		state.shakeY = -0.1;
	});
}

function applyDamageToPlayer(world: World, damage: number) {
	world.query(PlayerTag, Health, PlayerState).updateEach(([health, state]) => {
		health.current = Math.max(0, health.current - damage);
		state.damageFlash = 1.0;
		state.shakeX = (cosmeticRng() - 0.5) * 0.1;
		state.shakeY = -0.15;
	});
}
