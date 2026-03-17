/**
 * Creature procedural animation — joint rotations, state blending,
 * daytime tint, and eye aggro glow.
 * Extracted from CreatureRendererBehavior for <200 LOC split.
 */

import * as THREE from "three";
import type { AnimStateId, SpeciesId } from "../ecs/traits/index.ts";
import type { AssembledCreature } from "./creature-parts.ts";
import { advanceBlend, blendAnimParams, getAnimConfig, getStateParams, oscillate } from "./procedural-anim.ts";

/** Minimal animation state needed by animateJoints. */
export interface CreatureAnimState {
	animState: AnimStateId;
	prevAnimState: AnimStateId;
	blendProgress: number;
	isDaytime: boolean;
	species: SpeciesId | null;
	entityId: number;
}

/** Animate joint rotations using procedural animation system. Mutates blendProgress. */
export function animateJoints(anim: CreatureAnimState, assembled: AssembledCreature, now: number, dt: number): void {
	anim.blendProgress = advanceBlend(anim.blendProgress, dt);

	const fromParams = getStateParams(anim.prevAnimState);
	const toParams = getStateParams(anim.animState);
	const params = blendAnimParams(fromParams, toParams, anim.blendProgress);

	const config = getAnimConfig(anim.species ?? "morker");
	const t = now * 0.003 + anim.entityId;
	const parts = assembled.parts;

	// Body bob: breathing + state-driven bob (part 0)
	if (parts[0]) {
		const breath = oscillate(t, config.breathFreq, config.breathAmp);
		const bob = oscillate(t, config.walkBobFreq, config.walkBobAmp * params.bodyBob);
		parts[0].position.y = getOriginalY(parts[0]) + breath + bob;
	}

	// Head sway (part 1)
	if (parts[1]) {
		parts[1].rotation.y = oscillate(t, config.idleSwayFreq, config.idleSwayAmp * params.headSway);
	}

	// Arm swing (parts 4, 5)
	const swingAmp = config.walkSwingAmp * params.armSwing;
	if (parts[4]) {
		parts[4].rotation.x = oscillate(t, config.walkBobFreq, swingAmp);
	}
	if (parts[5]) {
		parts[5].rotation.x = oscillate(t, config.walkBobFreq, swingAmp, Math.PI);
	}

	// Daytime tint: body parts go orange when burning
	if (parts[0]?.children[0]) {
		const bodyMesh = parts[0].children[0] as THREE.Mesh;
		const mat = bodyMesh.material as THREE.MeshLambertMaterial;
		if (anim.isDaytime) {
			mat.color.setHex(0xff6600);
		} else if (mat.color.getHex() === 0xff6600) {
			mat.color.setHex(0x1a1a2e);
		}
	}

	// Eye aggro glow (parts 2, 3)
	const isAggro = anim.animState === "chase" || anim.animState === "attack";
	for (const eyeIdx of [2, 3]) {
		if (parts[eyeIdx]?.children[0]) {
			const eyeMesh = parts[eyeIdx].children[0] as THREE.Mesh;
			const eyeMat = eyeMesh.material as THREE.MeshBasicMaterial;
			eyeMat.color.setHex(isAggro ? 0xff0000 : 0xff4444);
		}
	}
}

/** Get original Y offset stored during assembly. */
function getOriginalY(group: THREE.Group): number {
	return (group.userData.originalY as number) ?? group.position.y;
}

/** Recursively dispose all geometries and materials in an assembled creature. */
export function disposeAssembled(assembled: AssembledCreature): void {
	for (const part of assembled.parts) {
		for (const child of part.children) {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				if (child.material instanceof THREE.Material) {
					child.material.dispose();
				}
			}
		}
	}
	if (assembled.lodMesh) {
		assembled.lodMesh.geometry.dispose();
		if (assembled.lodMesh.material instanceof THREE.Material) {
			assembled.lodMesh.material.dispose();
		}
	}
	if (assembled.pointLight) {
		assembled.pointLight.dispose();
	}
}
