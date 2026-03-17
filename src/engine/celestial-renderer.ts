/**
 * Celestial renderer — sun/moon orbit, stars, smooth sky color transitions.
 * Plain class (no JP Behavior). Owns a pivot Object3D added to the scene.
 */

import * as THREE from "three";
import { cosmeticRng } from "../world/noise.ts";

const STAR_COUNT = 1500;
const STAR_RADIUS = 80;
const SUN_DISTANCE = 100;
const MOON_DISTANCE = 100;

/** Sun-height thresholds for sky phases. */
const SUN_HIGH = 0.4;

/** Sky presets per phase: [background hex, sun intensity, ambient intensity, star opacity]. */
const SKY_DAY: [number, number, number, number] = [0x87ceeb, 1.2, 0.35, 0];
const SKY_DUSK: [number, number, number, number] = [0xff7e47, 0.5, 0.2, 0.5];
const SKY_NIGHT: [number, number, number, number] = [0x050510, 0, 0.05, 1];

export class CelestialRenderer {
	private pivot: THREE.Object3D;
	private sunMesh: THREE.Mesh;
	private moonMesh: THREE.Mesh;
	private stars: THREE.Points;
	private scene: THREE.Scene;
	private ambientLight: THREE.AmbientLight;
	private sunLight: THREE.DirectionalLight;

	/** Set externally each frame by GameBridge. */
	public timeOfDay = 0.25;
	public playerX = 0;
	public playerZ = 0;

	constructor(scene: THREE.Scene, ambientLight: THREE.AmbientLight, sunLight: THREE.DirectionalLight) {
		this.scene = scene;
		this.ambientLight = ambientLight;
		this.sunLight = sunLight;

		this.pivot = new THREE.Object3D();
		scene.add(this.pivot);

		// Sun — blocky cube matching the voxel aesthetic
		this.sunMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffaa }));
		this.sunMesh.position.set(0, SUN_DISTANCE, 0);
		sunLight.position.set(0, SUN_DISTANCE, 0);
		this.pivot.add(this.sunMesh);
		this.pivot.add(sunLight);

		// Moon
		this.moonMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshBasicMaterial({ color: 0xddddff }));
		this.moonMesh.position.set(0, -MOON_DISTANCE, 0);
		this.pivot.add(this.moonMesh);

		// Stars — scattered on a sphere
		this.stars = createStarField();
		this.pivot.add(this.stars);
	}

	update(dt: number): void {
		const timePI = this.timeOfDay * Math.PI * 2;
		this.pivot.position.set(this.playerX, 0, this.playerZ);
		this.pivot.rotation.z = -timePI;

		const sunHeight = Math.sin(timePI);
		const [bgHex, lightInt, ambInt, starOp] = skyPreset(sunHeight);

		const alpha = THREE.MathUtils.clamp(dt * 0.5, 0, 1);
		const targetBg = new THREE.Color(bgHex);

		if (this.scene.background && (this.scene.background as THREE.Color).isColor) {
			(this.scene.background as THREE.Color).lerp(targetBg, alpha);
		}
		if (this.scene.fog && (this.scene.fog as THREE.Fog).color) {
			(this.scene.fog as THREE.Fog).color.lerp(targetBg, alpha);
		}

		this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, ambInt, alpha);
		this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, lightInt, alpha);
		(this.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(
			(this.stars.material as THREE.PointsMaterial).opacity,
			starOp,
			alpha,
		);

		this.sunLight.target.position.set(this.playerX, 0, this.playerZ);
		this.sunLight.target.updateMatrixWorld();
	}

	dispose(): void {
		this.pivot.removeFromParent();
		this.sunMesh.geometry.dispose();
		(this.sunMesh.material as THREE.Material).dispose();
		this.moonMesh.geometry.dispose();
		(this.moonMesh.material as THREE.Material).dispose();
		this.stars.geometry.dispose();
		(this.stars.material as THREE.Material).dispose();
	}
}

// ─── Helpers ───

function skyPreset(sunHeight: number): [number, number, number, number] {
	if (sunHeight > SUN_HIGH) return SKY_DAY;
	if (sunHeight > 0) return SKY_DUSK;
	return SKY_NIGHT;
}

function createStarField(): THREE.Points {
	const geo = new THREE.BufferGeometry();
	const positions: number[] = [];
	for (let i = 0; i < STAR_COUNT; i++) {
		const u = cosmeticRng();
		const v = cosmeticRng();
		const theta = 2 * Math.PI * u;
		const phi = Math.acos(2 * v - 1);
		positions.push(
			STAR_RADIUS * Math.sin(phi) * Math.cos(theta),
			STAR_RADIUS * Math.sin(phi) * Math.sin(theta),
			STAR_RADIUS * Math.cos(phi),
		);
	}
	geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0 }));
}
