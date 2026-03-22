declare module 'yuka' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    multiplyScalar(s: number): this;
    divideScalar(s: number): this;
    normalize(): this;
    length(): number;
    squaredLength(): number;
    distanceTo(v: Vector3): number;
    squaredDistanceTo(v: Vector3): number;
  }

  export class GameEntity {
    name: string;
    active: boolean;
    position: Vector3;
    children: GameEntity[];
    parent: GameEntity | null;
    neighbors: GameEntity[];
    neighborhoodRadius: number;
    updateNeighborhood: boolean;
    update(delta: number): this;
  }

  export class MovingEntity extends GameEntity {
    velocity: Vector3;
    maxSpeed: number;
    updateOrientation: boolean;
  }

  export class SteeringBehavior {
    active: boolean;
    weight: number;
  }

  export class SteeringManager {
    constructor(vehicle: Vehicle);
    add(behavior: SteeringBehavior): this;
    remove(behavior: SteeringBehavior): this;
    clear(): this;
    calculate(delta: number, force: Vector3): Vector3;
  }

  export class Vehicle extends MovingEntity {
    mass: number;
    maxForce: number;
    steering: SteeringManager;
    smoother: unknown | null;
  }

  export class State {
    enter(owner: GameEntity): void;
    execute(owner: GameEntity): void;
    exit(owner: GameEntity): void;
    toJSON(): unknown;
    fromJSON(json: unknown): this;
    resolveReferences(entities: Map<string, GameEntity>): this;
    onMessage(owner: GameEntity, telegram: unknown): boolean;
  }

  export class StateMachine {
    owner: GameEntity | null;
    currentState: State | null;
    previousState: State | null;
    globalState: State | null;
    states: Map<string, State>;
    constructor(owner?: GameEntity);
    update(): this;
    add(id: string, state: State): this;
    remove(id: string): this;
    get(id: string): State | undefined;
    changeTo(id: string): this;
    revert(): this;
    in(id: string): boolean;
    handleMessage(telegram: unknown): boolean;
  }

  export class WanderBehavior extends SteeringBehavior {
    radius: number;
    distance: number;
    jitter: number;
    constructor(radius?: number, distance?: number, jitter?: number);
  }

  export class SeekBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target?: Vector3);
  }

  export class ArriveBehavior extends SteeringBehavior {
    target: Vector3;
    deceleration: number;
    tolerance: number;
    constructor(target?: Vector3, deceleration?: number, tolerance?: number);
  }

  export class PursuitBehavior extends SteeringBehavior {
    evader: MovingEntity | null;
    predictionFactor: number;
    constructor(evader?: MovingEntity, predictionFactor?: number);
  }

  export class FleeBehavior extends SteeringBehavior {
    target: Vector3;
    panicDistance: number;
    constructor(target?: Vector3, panicDistance?: number);
  }

  export class EvadeBehavior extends SteeringBehavior {
    pursuer: MovingEntity | null;
    panicDistance: number;
    predictionFactor: number;
    constructor(pursuer?: MovingEntity, panicDistance?: number, predictionFactor?: number);
  }

  export class EntityManager {
    entities: GameEntity[];
    add(entity: GameEntity): this;
    remove(entity: GameEntity): this;
    clear(): this;
    update(delta: number): this;
  }

  export class Goal {
    owner: GameEntity | null;
    status: string;
    constructor(owner?: GameEntity | null);
    activate(): void;
    execute(): void;
    terminate(): void;
    handleMessage(telegram: unknown): boolean;
    active(): boolean;
    inactive(): boolean;
    completed(): boolean;
    failed(): boolean;
    replanIfFailed(): this;
    activateIfInactive(): this;
    static STATUS: {
      ACTIVE: string;
      INACTIVE: string;
      COMPLETED: string;
      FAILED: string;
    };
  }

  export class CompositeGoal extends Goal {
    subgoals: Goal[];
    constructor(owner?: GameEntity | null);
    addSubgoal(goal: Goal): this;
    removeSubgoal(goal: Goal): this;
    clearSubgoals(): this;
    currentSubgoal(): Goal | null;
    executeSubgoals(): string;
    hasSubgoals(): boolean;
  }

  export class GoalEvaluator {
    characterBias: number;
    constructor(characterBias?: number);
    calculateDesirability(owner: GameEntity): number;
    setGoal(owner: GameEntity): void;
  }

  export class Think extends CompositeGoal {
    evaluators: GoalEvaluator[];
    constructor(owner?: GameEntity | null);
    addEvaluator(evaluator: GoalEvaluator): this;
    removeEvaluator(evaluator: GoalEvaluator): this;
    arbitrate(): this;
    registerType(type: string, ctor: new () => unknown): this;
  }
}
