export type GameAction =
  | 'moveForward'
  | 'moveBack'
  | 'moveLeft'
  | 'moveRight'
  | 'attack'
  | 'dodge'
  | 'parry'
  | 'interact'
  | 'tome'
  | 'pause'
  | 'hotbar1'
  | 'hotbar2'
  | 'hotbar3'
  | 'hotbar4'
  | 'hotbar5'
  | 'jump'
  | 'sprint'
  | 'look'
  | 'cycleBlock';

export class ActionMap {
  readonly #keyToAction = new Map<string, GameAction>();
  readonly #activeKeys = new Set<string>();

  bindKey(keyCode: string, action: GameAction): void {
    this.#keyToAction.set(keyCode, action);
  }

  getAction(keyCode: string): GameAction | undefined {
    return this.#keyToAction.get(keyCode);
  }

  setKeyDown(keyCode: string): void {
    this.#activeKeys.add(keyCode);
  }

  setKeyUp(keyCode: string): void {
    this.#activeKeys.delete(keyCode);
  }

  isActive(action: GameAction): boolean {
    for (const key of this.#activeKeys) {
      if (this.#keyToAction.get(key) === action) return true;
    }
    return false;
  }

  reset(): void {
    this.#activeKeys.clear();
  }

  static desktopDefaults(): ActionMap {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('KeyS', 'moveBack');
    map.bindKey('KeyA', 'moveLeft');
    map.bindKey('KeyD', 'moveRight');
    map.bindKey('Space', 'jump');
    map.bindKey('KeyQ', 'dodge');
    map.bindKey('ShiftLeft', 'sprint');
    map.bindKey('KeyE', 'interact');
    map.bindKey('Tab', 'tome');
    map.bindKey('Escape', 'pause');
    map.bindKey('Digit1', 'hotbar1');
    map.bindKey('Digit2', 'hotbar2');
    map.bindKey('Digit3', 'hotbar3');
    map.bindKey('Digit4', 'hotbar4');
    map.bindKey('Digit5', 'hotbar5');
    map.bindKey('KeyR', 'cycleBlock');
    return map;
  }
}
