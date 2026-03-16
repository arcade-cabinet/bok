/**
 * First-person view model — 3D tool/block held in hand, attached to camera.
 * Includes sway, breathing bob, walk bob, and swing animation.
 */

import * as THREE from "three";
import { Behavior } from "@jolly-pixel/engine";
import { BLOCKS, ITEMS, BlockId, type ItemDef } from "../../world/blocks.ts";

export class ViewModelBehavior extends Behavior {
  private viewModelGroup = new THREE.Group();
  private handLight!: THREE.PointLight;
  private camera!: THREE.PerspectiveCamera;
  private elapsed = 0;

  // Tracked state to avoid unnecessary rebuilds
  private currentSlotId = -999;
  private currentSlotType = "";

  // External state set by GameBridge each frame
  public slotData: { id: number; type: "block" | "item" } | null = null;
  public isMoving = false;
  public isSprinting = false;
  public swingProgress = 0;
  public swayX = 0;
  public swayY = 0;

  setCamera(cam: THREE.PerspectiveCamera) {
    this.camera = cam;
    this.viewModelGroup.position.set(0.4, -0.3, -0.5);
    this.handLight = new THREE.PointLight(0xffa500, 0, 15);
    cam.add(this.handLight);
    cam.add(this.viewModelGroup);
  }

  awake() {
    this.needUpdate = true;
  }

  update(dt: number) {
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
    const walkBob = this.isMoving
      ? Math.sin(this.elapsed * (this.isSprinting ? 12 : 8)) * 0.05
      : 0;
    this.viewModelGroup.position.y = -0.3 + breathY + walkBob;

    // Swing animation
    let swingRotX = 0;
    if (this.swingProgress > 0) {
      swingRotX = Math.sin(this.swingProgress * Math.PI) * -1.2;
    }

    this.viewModelGroup.rotation.x = swingRotX + this.swayX;
    this.viewModelGroup.rotation.y = this.swayY;
    this.viewModelGroup.rotation.z = -this.swayY * 0.5;
  }

  private rebuildModel() {
    // Clear existing
    while (this.viewModelGroup.children.length > 0) {
      const child = this.viewModelGroup.children[0];
      this.viewModelGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    this.handLight.intensity = this.slotData?.id === BlockId.Torch ? 1.5 : 0;

    if (!this.slotData) return;

    const stickMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });

    if (this.slotData.type === "block") {
      const blockDef = BLOCKS[this.slotData.id];
      const color = blockDef ? blockDef.color : "#ffffff";
      const bMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.8,
      });
      const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), bMat);
      if (this.slotData.id === BlockId.Torch) blockMesh.position.set(0, 0.1, 0);
      this.viewModelGroup.add(blockMesh);
    } else if (this.slotData.type === "item") {
      const itemDef: ItemDef | undefined = ITEMS[this.slotData.id];
      if (!itemDef) return;

      const headMat = new THREE.MeshStandardMaterial({ color: itemDef.color, roughness: 0.6 });
      const tool = new THREE.Group();

      if (itemDef.type === "pickaxe") {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), stickMat);
        handle.position.set(0, -0.1, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.04), headMat);
        head.position.set(0, 0.1, 0);
        tool.add(handle, head);
        tool.rotation.x = -Math.PI / 4;
      } else if (itemDef.type === "axe") {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), stickMat);
        handle.position.set(0, -0.1, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.04), headMat);
        head.position.set(0.08, 0.05, 0);
        tool.add(handle, head);
        tool.rotation.x = -Math.PI / 4;
      } else if (itemDef.type === "sword") {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), stickMat);
        handle.position.set(0, -0.2, 0);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), headMat);
        guard.position.set(0, -0.1, 0);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), headMat);
        blade.position.set(0, 0.12, 0);
        tool.add(handle, guard, blade);
        tool.rotation.x = -Math.PI / 3;
      }

      this.viewModelGroup.add(tool);
    }
  }
}
