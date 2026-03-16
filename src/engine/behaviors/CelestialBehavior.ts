/**
 * Celestial system — sun/moon meshes orbiting on a pivot, stars, smooth sky transitions.
 * Ported from box.html's celestialPivot system.
 */

import { Behavior } from "@jolly-pixel/engine";
import * as THREE from "three";

export class CelestialBehavior extends Behavior {
	private sunMesh!: THREE.Mesh;
	private moonMesh!: THREE.Mesh;
	private stars!: THREE.Points;
	private ambientLight!: THREE.AmbientLight;
	private sunLight!: THREE.DirectionalLight;
	private scene!: THREE.Scene;

	// Set externally each frame by GameBridge
	public timeOfDay = 0.25;
	public playerX = 0;
	public playerZ = 0;

	setup(scene: THREE.Scene, ambientLight: THREE.AmbientLight, sunLight: THREE.DirectionalLight) {
		this.scene = scene;
		this.ambientLight = ambientLight;
		this.sunLight = sunLight;

		const pivot = this.actor.object3D;

		// Sun
		this.sunMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffaa }));
		this.sunMesh.position.set(0, 100, 0);
		sunLight.position.set(0, 100, 0);
		pivot.add(this.sunMesh);
		pivot.add(sunLight);

		// Moon
		this.moonMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshBasicMaterial({ color: 0xddddff }));
		this.moonMesh.position.set(0, -100, 0);
		pivot.add(this.moonMesh);

		// Stars
		const starGeo = new THREE.BufferGeometry();
		const starPos: number[] = [];
		for (let i = 0; i < 1500; i++) {
			const u = Math.random();
			const v = Math.random();
			const theta = 2 * Math.PI * u;
			const phi = Math.acos(2 * v - 1);
			const r = 80;
			starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
		}
		starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
		this.stars = new THREE.Points(
			starGeo,
			new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0 }),
		);
		pivot.add(this.stars);
	}

	awake() {
		this.needUpdate = true;
	}

	update(dt: number) {
		const pivot = this.actor.object3D;
		const timePI = this.timeOfDay * Math.PI * 2;
		pivot.position.set(this.playerX, 0, this.playerZ);
		pivot.rotation.z = -timePI;

		const sunHeight = Math.sin(timePI);

		let bgHex: number;
		let lightInt: number;
		let ambInt: number;
		let starOp: number;

		if (sunHeight > 0.4) {
			bgHex = 0x87ceeb;
			lightInt = 1.2;
			ambInt = 0.35;
			starOp = 0;
		} else if (sunHeight > 0) {
			bgHex = 0xff7e47;
			lightInt = 0.5;
			ambInt = 0.2;
			starOp = 0.5;
		} else {
			bgHex = 0x050510;
			lightInt = 0;
			ambInt = 0.05;
			starOp = 1;
		}

		const targetBg = new THREE.Color(bgHex);
		if (this.scene.background && (this.scene.background as THREE.Color).isColor) {
			(this.scene.background as THREE.Color).lerp(targetBg, dt * 0.5);
		}
		if (this.scene.fog && (this.scene.fog as THREE.Fog).color) {
			(this.scene.fog as THREE.Fog).color.lerp(targetBg, dt * 0.5);
		}

		this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, ambInt, dt * 0.5);
		this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, lightInt, dt * 0.5);
		(this.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(
			(this.stars.material as THREE.PointsMaterial).opacity,
			starOp,
			dt * 0.5,
		);

		this.sunLight.target.position.set(this.playerX, 0, this.playerZ);
		this.sunLight.target.updateMatrixWorld();
	}
}
