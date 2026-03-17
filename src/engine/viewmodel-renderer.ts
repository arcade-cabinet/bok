/**
 * First-person view model renderer — 3D tool/block held in hand, attached to camera.
 * Includes sway, breathing bob, walk bob, and swing animation.
 *
 * Plain class — no JP Behavior dependency. Call update(dt) from GameBridge.
 */

import * as THREE from "three";
import { BLOCKS, BlockId, ITEMS, type ItemDef } from "../world/blocks.ts";

export interface ViewModelSlot {
	id: number;
	type: "block" | "item";
}

export class ViewModelRenderer {
	private group = new THREE.Group();
	private handLight: THREE.PointLight;
	private elapsed = 0;

	// Tracked state to avoid unnecessary rebuilds
	private currentSlotId = -999;
	private currentSlotType = "";

	// External state set by GameBridge each frame
	slotData: ViewModelSlot | null = null;
	isMoving = false;
	isSprinting = false;
	swingProgress = 0;
	swayX = 0;
	swayY = 0;

	constructor(camera: THREE.PerspectiveCamera) {
		this.group.position.set(0.4, -0.3, -0.5);
		this.handLight = new THREE.PointLight(0xffa500, 0, 15);
		camera.add(this.handLight);
		camera.add(this.group);
	}

	update(dt: number): void {
		this.elapsed += dt;

		// Rebuild model if slot changed
		const newId = this.slotData?.id ?? -1;
		const newType = this.slotData?.type ?? "";
		if (newId !== this.currentSlotId || newType !== this.currentSlotType) {
			this.currentSlotId = newId;
			this.currentSlotType = newType;
			this.rebuildModel();
		}

		// Breathing + walk bob
		const breathY = Math.sin(this.elapsed * 2) * 0.01;
		const walkBob = this.isMoving ? Math.sin(this.elapsed * (this.isSprinting ? 12 : 8)) * 0.05 : 0;
		this.group.position.y = -0.3 + breathY + walkBob;

		// Swing animation
		let swingRotX = 0;
		if (this.swingProgress > 0) {
			swingRotX = Math.sin(this.swingProgress * Math.PI) * -1.2;
		}

		this.group.rotation.x = swingRotX + this.swayX;
		this.group.rotation.y = this.swayY;
		this.group.rotation.z = -this.swayY * 0.5;
	}

	private disposeObject3D(obj: THREE.Object3D): void {
		obj.traverse((node) => {
			const mesh = node as THREE.Mesh;
			if (mesh.geometry) mesh.geometry.dispose();
			if (mesh.material) {
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				for (const mat of materials) mat.dispose();
			}
		});
	}

	private rebuildModel(): void {
		// Clear existing — dispose geometries and materials to prevent GPU memory leaks
		while (this.group.children.length > 0) {
			const child = this.group.children[0];
			this.group.remove(child);
			this.disposeObject3D(child);
		}

		this.handLight.intensity = this.slotData?.id === BlockId.Torch ? 1.5 : 0;

		if (!this.slotData) return;

		if (this.slotData.type === "block") {
			this.buildBlockModel(this.slotData.id);
		} else if (this.slotData.type === "item") {
			this.buildItemModel(this.slotData.id);
		}
	}

	private buildBlockModel(blockId: number): void {
		const blockDef = BLOCKS[blockId];
		const color = blockDef ? blockDef.color : "#ffffff";
		const bMat = new THREE.MeshStandardMaterial({
			color: new THREE.Color(color),
			roughness: 0.8,
		});
		const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), bMat);
		if (blockId === BlockId.Torch) blockMesh.position.set(0, 0.1, 0);
		this.group.add(blockMesh);
	}

	private buildItemModel(itemId: number): void {
		const itemDef: ItemDef | undefined = ITEMS[itemId];
		if (!itemDef) return;

		const stickMat = new THREE.MeshStandardMaterial({
			color: 0x5d4037,
			roughness: 0.9,
		});
		const headMat = new THREE.MeshStandardMaterial({
			color: itemDef.color,
			roughness: 0.6,
		});
		const tool = new THREE.Group();

		if (itemDef.type === "pickaxe") {
			this.buildPickaxe(tool, stickMat, headMat);
		} else if (itemDef.type === "axe") {
			this.buildAxe(tool, stickMat, headMat);
		} else if (itemDef.type === "sword") {
			this.buildSword(tool, stickMat, headMat);
		}

		this.group.add(tool);
	}

	private buildPickaxe(tool: THREE.Group, stickMat: THREE.Material, headMat: THREE.Material): void {
		const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), stickMat);
		handle.position.set(0, -0.1, 0);
		const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.04), headMat);
		head.position.set(0, 0.1, 0);
		tool.add(handle, head);
		tool.rotation.x = -Math.PI / 4;
	}

	private buildAxe(tool: THREE.Group, stickMat: THREE.Material, headMat: THREE.Material): void {
		const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), stickMat);
		handle.position.set(0, -0.1, 0);
		const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.04), headMat);
		head.position.set(0.08, 0.05, 0);
		tool.add(handle, head);
		tool.rotation.x = -Math.PI / 4;
	}

	private buildSword(tool: THREE.Group, stickMat: THREE.Material, headMat: THREE.Material): void {
		const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), stickMat);
		handle.position.set(0, -0.2, 0);
		const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), headMat);
		guard.position.set(0, -0.1, 0);
		const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), headMat);
		blade.position.set(0, 0.12, 0);
		tool.add(handle, guard, blade);
		tool.rotation.x = -Math.PI / 3;
	}
}
