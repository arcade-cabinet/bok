import type { World } from 'koota';
import { LookIntent, MovementIntent } from '../traits/index.ts';
import { ActionMap } from './ActionMap.ts';
import { GamepadDevice } from './GamepadDevice.ts';
import { KeyboardMouseDevice } from './KeyboardMouseDevice.ts';
import { TouchDevice } from './TouchDevice.ts';

export class InputSystem {
  readonly actionMap: ActionMap;
  readonly keyboard: KeyboardMouseDevice;
  readonly gamepad: GamepadDevice;
  readonly touch: TouchDevice;

  constructor(canvas: HTMLCanvasElement) {
    this.actionMap = ActionMap.desktopDefaults();
    this.keyboard = new KeyboardMouseDevice(this.actionMap);
    this.gamepad = new GamepadDevice();
    this.touch = new TouchDevice();
    this.keyboard.attach(canvas);
    this.touch.attach(canvas);
  }

  update(world: World): void {
    this.gamepad.poll();

    // Movement intent
    let dirX = 0;
    let dirZ = 0;
    if (this.actionMap.isActive('moveForward')) dirZ -= 1;
    if (this.actionMap.isActive('moveBack')) dirZ += 1;
    if (this.actionMap.isActive('moveLeft')) dirX -= 1;
    if (this.actionMap.isActive('moveRight')) dirX += 1;

    // Blend with gamepad/touch
    const gpStick = this.gamepad.leftStick;
    const touchStick = this.touch.moveStick;
    dirX += gpStick.x + touchStick.x;
    dirZ += gpStick.y + touchStick.y;

    // Clamp magnitude
    const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (mag > 1) {
      dirX /= mag;
      dirZ /= mag;
    }

    world.set(MovementIntent, {
      dirX,
      dirZ,
      sprint: this.actionMap.isActive('sprint'),
      jump: this.actionMap.isActive('jump'),
    });

    // Look intent
    const mouseDelta = this.keyboard.consumeMouseDelta();
    const gpRight = this.gamepad.rightStick;
    const touchLook = this.touch.consumeLookDelta();
    world.set(LookIntent, {
      deltaX: mouseDelta.x + gpRight.x * 5 + touchLook.x,
      deltaY: mouseDelta.y + gpRight.y * 5 + touchLook.y,
    });
  }
}
