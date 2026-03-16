# Runic Computation — Block Behaviors and Emergent Structures

## The Core Idea

Blocks in Bok are not inert. Certain blocks have **behaviors** — they sense, emit, conduct, transform, and act. When blocks with behaviors are placed adjacent to each other, signals propagate between them. Emergent function arises not from the game recognizing prescribed patterns, but from the player **composing behaviors into machines**.

This is carving runes into the world. Each rune-inscribed block is an instruction. A chain of them is a program. The world executes it.

## The Metaphor

In Norse tradition, runes aren't just letters — they are forces. Carving ᚲ (Kenaz, torch) onto bark doesn't just write the word "fire" — it invokes fire's essence. In Bok, inscribing a rune onto a block doesn't label it — it gives it a **behavior**. A network of inscribed blocks is a living inscription, a saga that runs.

The player isn't "building a forge." They're inscribing a sentence that says "gather heat, transform stone into metal." The forge is what that sentence *does*.

## Block Properties

Every block has a fixed material type (wood, stone, iron, etc.) and up to **six face inscriptions** — one rune per face. A block is not inscribed once; it is etched directionally. Each face can carry a different rune, making a single block a multi-instruction circuit node.

### Material Properties (Intrinsic)

| Property | Blocks | Effect |
|----------|--------|--------|
| **Conducts Signal** | Stone, Iron, Copper, Crystal | Signal passes through |
| **Insulates** | Wood, Planks, Leaves | Signal stops |
| **Stores** | Chests (future), Hollowed blocks | Holds items/resources |
| **Burns** | Wood, Planks, Leaves | Consumed by fire signal, produces light/heat |
| **Flows** | Water | Propagates downhill, cools |
| **Resonates** | Crystal | Amplifies signal strength |

### Face-Based Rune Inscriptions

The player uses a **chisel** to etch runes onto individual block faces. A block has 6 faces (+x, -x, +y, -y, +z, -z). Each face can hold one rune or be blank. A blank face on a conducting block passes signal through unchanged. An etched face intercepts the signal and applies the rune's behavior **directionally**.

```
     [Isa on top face]          ← signal exits upward with delay
            │
[in] → ┌───┴───┐ → [Naudiz]   ← signal exits east, inverted
        │ IRON  │
        └───┬───┘
            │
     [Hagalaz bottom]          ← signal exits downward only if gate signal present
```

One block. Three different behaviors. The face the signal enters and exits through determines what happens. This is the block as **crossroads**, not component.

#### Visible vs. Internal Faces

When two blocks are placed adjacent, their touching faces become **internal**. Runes on internal faces are hidden from view but still active. This creates hidden logic — a wall of plain stone blocks can carry a complete computational network on its internal faces. The wall IS the computer. The exterior shows nothing.

Players etch internal-face runes by inscribing BEFORE placing the adjacent block, or by using an X-ray view (long-press with chisel) to see and modify internal faces.

#### Etching Interaction (Mobile)

Two interaction modes, progressively unlocked:

**Beginner — Tap + Rune Wheel** (taught by the Tomte):
1. Player holds chisel, taps a block face → face highlights
2. Rune wheel appears around the tap point
3. Drag to select rune → rune etches onto that face

**Expert — Drag-to-Etch** (unlocked after mastering 3+ runes):
1. Player holds chisel, drags across a block face
2. Drag pattern determines the rune (↓ = Isa, ✕ = Hagalaz, ∧ = Kenaz)
3. Faster for experienced players, feels like actual carving

Both modes remain available after expert unlock. The Tomte demonstrates the upgrade.

### Rune Vocabulary

Each rune can be etched onto any compatible face. The rune's behavior is always **relative to the face it occupies** — an EMIT rune on the north face emits northward, a GATE rune on the east face gates signals entering from the east.

| Rune | Name | Behavior | Description |
|------|------|----------|-------------|
| ᚲ | **Kenaz** (Torch) | **EMIT(heat)** | Produces a continuous heat signal. The elemental source. |
| ᛊ | **Sowilo** (Sun) | **EMIT(light)** | Produces a continuous light signal. Repels Mörker. |
| ᚠ | **Fehu** (Wealth) | **PULL(resource)** | Attracts nearby loose items/drops within radius. A collector. |
| ᚢ | **Uruz** (Strength) | **PUSH(force)** | Exerts a push on entities (creatures, items) in the signal direction. |
| ᚦ | **Thurisaz** (Thorn) | **DAMAGE(signal)** | Converts incoming signal to area damage. A trap. |
| ᚨ | **Ansuz** (Wisdom) | **SENSE(entity)** | Detects creatures/player within radius. Emits signal on detection. |
| ᚱ | **Raido** (Journey) | **TELEPORT(linked)** | Pairs with another Raido block. Moves items/player between them. |
| ᛉ | **Algiz** (Protection) | **WARD(radius)** | Creates an exclusion zone. Hostile creatures can't enter. |
| ᛏ | **Tiwaz** (Victory) | **BUFF(combat)** | Entities in radius deal more damage. A war standard. |
| ᛒ | **Berkanan** (Birch) | **GROW(nature)** | Accelerates natural growth in radius. Saplings grow, crops yield. |
| ᛗ | **Mannaz** (Humanity) | **CALM(creature)** | Neutral creatures in radius become friendly. A taming ward. |
| ᛃ | **Jera** (Harvest) | **TRANSFORM(input→output)** | Converts one resource to another when signal + input present. The core of crafting. |
| ᚾ | **Naudiz** (Need) | **INVERT(signal)** | Outputs signal when receiving none. The NOT gate. Emits strength 5 when unpowered; silent when powered. |
| ᛁ | **Isa** (Ice) | **DELAY(ticks)** | Holds signal for N ticks before releasing (default 1 = 250ms). On crystal: N=2. Enables sequential logic. |
| ᚺ | **Hagalaz** (Hail) | **GATE(condition)** | Passes signal from one face only if signal present on perpendicular face. The AND gate / conditional filter. |

## Signal Propagation

Signals flow through **conducting materials** from emitter to receiver. The rules are simple:

### Signal Types
- **Heat** — produced by Kenaz. Enables smelting, cooking, light. Diminishes over distance.
- **Light** — produced by Sowilo. Repels darkness creatures. Diminishes over distance.
- **Force** — produced by Uruz. Pushes entities. Directional (follows block facing).
- **Detection** — produced by Ansuz. Binary (creature present / not present). Triggers other blocks.
- **Resource** — not a signal but a flow. Items move through Fehu-inscribed paths.

### Propagation Rules

```text
1. An EMIT face produces signal at strength S (default 10) in its facing direction
2. Signal propagates to the adjacent block through the receiving face
3. At each face boundary:
   a. Check the EXIT face of the source block — apply its rune (if any)
   b. Check the ENTRY face of the destination block — apply its rune (if any)
   c. If no rune on either face, signal passes through based on material:
      - Conducting material: strength -= 1 (stone, iron, copper)
      - Resonating material: strength *= 1.5 (crystal)
      - Insulating material: signal stops
      - Air: signal stops (signals travel through blocks, not air)
4. Signal continues through the destination block to its other faces
5. Each exit face with a rune applies that rune's behavior directionally
6. Signal strength determines behavior intensity
```

The face-based model means a single block can **route** signals — enter from one face, exit from a different face with a different transformation. A block with Kenaz on the north face and Naudiz on the south face is a heat emitter going north and an inverter going south, simultaneously.

### Tick Rate

Signal propagation runs on a **slow tick** (4 ticks/second, every 250ms), not per-frame. This is:
- Performant on mobile (max ~100 blocks evaluated per tick)
- Visible to the player (they can watch signals propagate)
- Debuggable (place a block, watch the effect ripple outward)

Each tick, the system:
1. Collects all EMIT blocks in loaded chunks
2. BFS from each emitter through conducting blocks
3. Activates any behavior blocks reached by sufficient signal
4. Applies effects (damage, push, transform, etc.)

## Emergent Machines

The player doesn't build a "forge" by following a pattern. They **invent** one by composing behaviors:

### Example: A Forge (Emerged, Not Prescribed)

```
[Kenaz on Stone] → stone → stone → [Jera on Iron Block]
     (emits heat)    (conducts)       (transforms ore → ingot when heat signal received)
```

The player places a Kenaz-inscribed stone block (heat emitter), connects it via stone blocks to a Jera-inscribed iron block (transformer). When the player drops ore near the Jera block, and heat signal is present, the ore transforms into an ingot.

There's no "forge recipe." Any arrangement that delivers heat to a Jera transformer IS a forge. The player might build a 2-block forge or a massive industrial chain. Both work.

### Example: A Defensive Perimeter

```
[Ansuz on Stone] → stone → stone → [Thurisaz on Stone]
     (senses enemies)  (conducts)     (damages when signaled)
```

An Ansuz sensor detects approaching Mörker. Signal conducts through stone to a Thurisaz trap block. When signal arrives, the Thurisaz block damages enemies in its radius.

The player could also add Sowilo (light) blocks to the chain — the detection triggers both traps AND lights, creating a responsive defense that only activates at night when threats approach.

### Example: A Resource Collector

```
[Fehu on Stone] → air gap → dropped items get pulled in
                         ↓
             [Jera on Planks] (transforms raw wood → planks automatically)
```

Fehu pulls nearby items. If those items land adjacent to a Jera block receiving the right signal, they transform. Automated crafting from emergent composition.

### Example: A Settlement Heart

```
                    [Sowilo] (light ward)
                        |
[Ansuz] → stone → [Algiz on Crystal] → amplified protection radius
                        |
                    [Berkanan] (growth acceleration)
```

A central crystal amplifies an Algiz ward's radius. Ansuz sensors on the perimeter feed detection signals inward. Sowilo blocks create light. Berkanan blocks accelerate nearby farms. This is a **settlement** — not because the game labeled it, but because it *does settlement things*.

## Archetypes, Not Prescriptions

The game defines **archetypes** — general categories of function — and recognizes when a player's build achieves one:

| Archetype | Recognized When | Effect |
|-----------|-----------------|--------|
| **Hearth** | EMIT(heat) + enclosed space | Shelter bonuses, creature attraction |
| **Workshop** | EMIT(heat) + TRANSFORM within 5 blocks | Crafting tier unlocked |
| **Beacon** | EMIT(light) with strength > 20 | Map-visible landmark, Lyktgubbe attraction |
| **Ward** | WARD active with radius > 5 | Territory claim, creature exclusion |
| **Trap** | SENSE + DAMAGE connected | Automated defense recognition |
| **Farm** | GROW active + saplings/crops nearby | Accelerated resource production |
| **Gate** | Two paired TELEPORT blocks | Fast-travel node registered in Kartan |
| **Settlement** | Hearth + Workshop + Ward colocated | Full settlement status, named location |

Archetype recognition is **emergent** — the game checks for functional capability, not block arrangement. If the player achieves the function through 3 blocks or 300, it's the same archetype.

### Settlement Founding

A **settlement** is recognized when three archetypes are colocated (within a chunk):
- A **Hearth** (warmth + shelter)
- A **Workshop** (crafting capability)
- A **Ward** (defense perimeter)

When a settlement is first recognized:
- The Sagan (saga) records the founding: *"Day 7 — A stuga rises in Ängen."*
- The location gets a name (procedurally generated Swedish place name)
- The Kartan marks it as a named settlement
- Passive creature behavior shifts (Lyktgubbar gather, Skogssniglar graze nearby)
- The inscription level checkpoint changes the world's response

Settlements can **grow** as more archetypes overlap:
- Add a Farm → settlement produces resources passively
- Add a Gate → settlement connects to the fast-travel network
- Add a Beacon → settlement is visible from far away on the map
- Multiple Wards → settlement is harder for hostiles to approach

## Signals and the 4X Loop

| Pillar | How Signals Serve It |
|--------|---------------------|
| **eXplore** | Discover new rune inscriptions at Fornlämningar. Each rune is a new capability. Crystal deposits enable amplification. Deep biomes have unique signal materials. |
| **eXpand** | Build settlements with functional capability. Expand ward radii. Connect settlements via Raido gates. Territory is defined by what your inscriptions DO, not just where your blocks ARE. |
| **eXploit** | Automate resource processing with Fehu + Jera chains. Mine ore, conduct heat, transform to ingots — all without manual crafting. Longer chains = higher throughput. Crystal amplification = industrial scale. |
| **eXterminate** | Build active defenses with Ansuz + Thurisaz. Light perimeters with Sowilo. Ward zones with Algiz. The settlement fights for itself. Scale defense with scale of threat (inscription level). |

## Performance Budget

The runic computation system must run on mobile. Constraints:

| Metric | Budget |
|--------|--------|
| Signal ticks/second | 4 (250ms interval) |
| Max evaluated blocks per tick | 128 |
| Max active emitters per loaded area | 32 |
| Max signal propagation depth (BFS) | 16 blocks from any emitter |
| Max active behavior effects per tick | 16 |

If limits are exceeded, farthest emitters from the player are paused. Signal propagation uses BFS with a visited set — no block is evaluated twice per tick.

### Spatial Index

Active inscribed blocks are tracked in a **chunk-level spatial index**:

```typescript
// Face index: 0=+x, 1=-x, 2=+y, 3=-y, 4=+z, 5=-z
type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

// Per-chunk: which block faces have inscriptions
chunkInscriptions: Map<chunkKey, Map<voxelKey, Map<FaceIndex, RuneId>>>
```

Updated on block place/remove/etch. The signal system only iterates inscribed blocks, not all voxels. A block with any etched face appears in the index. The face map is sparse — most blocks have 1-3 etched faces, not all 6.

## Computational Completeness

Minecraft stumbled into computational universality through redstone — a signal wire with delay, torches as NOT gates, and repeaters for timing. Players built CPUs, but the system was never *designed* for it. Bok owns this from the start.

### Inspirations and What We Take From Each

| System | Core Insight | What We Adopt |
|--------|-------------|---------------|
| **Wireworld** | 4 cell states (empty/head/tail/conductor) simulate electronic circuits. Elegance: *signal is a wavefront*, not a wire state. | Our signal propagation IS Wireworld. Signals are wavefronts moving through conductors. We already have this. |
| **LOGO** | Simple commands (forward, turn, repeat) compose into complex fractals. The turtle is an *agent with state*. | Uruz (push) + Raido (teleport) give us entity movement through rune programs. Items ARE our turtles — they move through the world following rune instructions. |
| **Rule 110** | A 1D cellular automaton with 3-neighbor rules is Turing complete. Proves: you need *very few* primitives. | Confirms our approach: we don't need many runes. We need the RIGHT runes — specifically, we need state + conditional branching + feedback. |
| **Conway's Game of Life** | Birth/death rules on a grid create gliders, oscillators, and ultimately universal computation. Key: *simple local rules, global emergent behavior*. | Our signal BFS is the update rule. Rune blocks are live cells. Conducting blocks are the grid. Emergence comes from composition, not prescription. |
| **Befunge** | A 2D language where the instruction pointer moves through a grid of characters. Direction changes ARE control flow. | Our signals propagate in 3D through blocks. A signal path IS a program. Branching happens at junctions. The world IS the source code. |
| **Redstone (Minecraft)** | Wire + NOT gate (torch) + delay (repeater) = Turing complete. *Accidental*, clunky, but incredibly powerful. | We take the lesson: wire + inversion + delay = completeness. But we design it in, not bolt it on. Our version: conductor + Naudiz (invert) + Isa (delay). |
| **Factorio** | Combinators (arithmetic, decider, constant) operate on typed signals. Circuit networks carry multiple signals simultaneously. | Jera already transforms. We add Hagalaz (combine) to merge/split signal types. Multiple signal types on one wire = richer computation. |
| **Zachtronics** | Constrained programming (limited registers, spatial layout matters). The *constraint* is what makes it a puzzle. | Our 16-block propagation depth and 128-block tick budget ARE the constraint. Efficient rune programs are puzzles. Optimization is gameplay. |
| **Noita / Falling Sand** | Element interactions create emergent chemistry. Fire + wood = ash. Water + lava = stone. | Material properties (burns, flows, conducts) already do this. Fire signal consuming wood blocks, water cooling heat signals — emergent element interaction. |
| **Dwarf Fortress** | Layered systems (fluid sim, temperature, creature AI, material properties) interact to create emergent stories. | Our signal types (heat, light, force, detection) are independent layers that interact at behavior blocks. A Jera block doesn't care if heat came from Kenaz or from burning wood — it just needs heat. |

### The Three Missing Primitives

The current rune set has emitters, sensors, effectors, and a transformer — but lacks three capabilities essential for computation:

1. **State** — a block that remembers (stores a value between ticks)
2. **Inversion** — a block that outputs signal when it receives NONE (NOT gate)
3. **Timing** — a block that delays signal propagation (enables sequential logic)

These three, combined with the existing signal propagation (which already provides AND behavior at junctions where two signals must meet), complete the computational model.

### New Computational Runes

| Rune | Name | Behavior | Description |
|------|------|----------|-------------|
| ᚾ | **Naudiz** (Need/Constraint) | **INVERT(signal)** | Outputs signal when receiving NONE. Stops output when signal arrives. The NOT gate. When unpowered, emits at strength equal to the block's base output (5). When powered, goes silent. |
| ᛁ | **Isa** (Ice/Stillness) | **DELAY(ticks)** | Holds a received signal for N ticks before releasing it. N = 1 by default (250ms). On crystal: N = 2. Enables sequential logic and oscillators. |
| ᚺ | **Hagalaz** (Hail/Disruption) | **GATE(condition)** | Passes signal from one face ONLY if signal is also present on an adjacent perpendicular face. A conditional gate. The AND/filter. Without the gate signal, blocks the main signal entirely. |

### How Turing Completeness Emerges

With these three runes added to the existing set, players can build:

**NOT gate** — Naudiz alone.
```
signal → [Naudiz on Stone] → inverted signal
            (outputs when input absent, silent when input present)
```

**AND gate** — Hagalaz alone.
```
signal A → [Hagalaz on Stone] → output (only if B also present)
                    ↑
               signal B (perpendicular face)
```

**OR gate** — Two signals meeting at a conductor. Both propagate to the output.
```
signal A → stone ← signal B
              ↓
           output (either A or B activates it)
```

**NAND gate** — Hagalaz feeding into Naudiz. NAND is functionally complete — every possible logic function can be built from NAND gates alone.
```
A → [Hagalaz] → [Naudiz] → output
         ↑
         B
```

**Flip-flop (1-bit memory)** — A Naudiz + Isa feedback loop. Signal loops through a delay, feeding back into its own inverter. The loop sustains a stable state that can be flipped by external input.
```
        ┌──── [Isa on Stone] ←──┐
        ↓                        │
[Naudiz on Stone] → stone → stone┘
        ↑
   (set/reset input)
```

**Clock/oscillator** — Naudiz feeding into Isa feeding back into Naudiz. Self-sustaining pulse at a frequency determined by the delay chain length.
```
[Naudiz] → stone → [Isa] → stone → back to [Naudiz]
  (inverts)         (delays)         (loop creates oscillation)
```

**Counter** — Chain of flip-flops. Each flip toggles the next. Binary counting.

**Conditional routing** — Hagalaz gates on different paths let a signal choose between outputs based on another signal's presence. This is the IF/ELSE of runic computation.

### The LOGO Connection: Items as Turtles

LOGO's power comes from a *movable agent* executing sequential instructions. In Bok, **items moving through rune networks ARE turtles**:

1. Fehu (pull) moves items toward it — `FORWARD`
2. Uruz (push) pushes items in a direction — `FORWARD` with facing
3. Jera (transform) changes the item — the turtle changes state
4. Hagalaz (gate) routes items conditionally — `IF` the right signal is present, the item goes this way; otherwise, that way
5. Raido (teleport) jumps items between points — `GOTO`

A chain of these runes creates a **program that items execute by flowing through it**. The player builds a physical pipeline — items enter, get routed, transformed, and output. This is a LOGO program written in stone and iron.

### Signal Algebra

Signals aren't just on/off. They carry **type** and **strength**. This gives us richer computation than pure binary:

```
Signal = { type: SignalType, strength: number (0-15) }

Types: heat | light | force | detection

Rules at junctions:
- Same type, same direction: strengths ADD (max 15)
- Same type, opposing directions: strengths SUBTRACT (min 0)
- Different types: pass through independently (multiplexed)
- Hagalaz: passes type A only if type B present on gate face
- Naudiz: inverts one signal type, passes others unchanged
- Jera: consumes input signal type, can emit a different type
```

This means a single conductor can carry heat AND light simultaneously. A Hagalaz block can gate heat based on detection — "only smelt when an enemy is detected" or "only light up when it's dark." Signals are multiplexed, not exclusive.

### Computational Complexity vs. Mobile Performance

The 128-block evaluation budget seems limiting, but it's actually *generous* for runic computation:

| Construction | Blocks Used | What It Computes |
|-------------|------------|-----------------|
| NOT gate | 1 (Naudiz) | Signal inversion |
| AND gate | 1 (Hagalaz) | Signal conjunction |
| SR Latch | 4 (2 Naudiz + 2 conductor) | 1-bit memory |
| Clock | 4 (1 Naudiz + 1 Isa + 2 conductor) | Periodic pulse |
| 4-bit counter | ~20 | Counts 0-15 |
| 8-step sequencer | ~32 | Timed automation sequence |
| Full adder | ~12 | Binary addition |
| Simple state machine | ~40 | Multi-state automation |

A player can build meaningful computational devices well within the 128-block budget. The constraint is the puzzle — *optimize your rune program to fit the performance budget*. This is the Zachtronics lesson: limitation breeds creativity.

For players who want to build larger, crystal amplification extends effective range, and multiple chunks can host independent circuits that communicate through Raido-linked signal bridges.

### The Befunge Parallel: World as Source Code

In Befunge, the program IS the 2D grid. The instruction pointer moves through it, executing characters as instructions. Direction changes are control flow.

In Bok, signals ARE the instruction pointer. The conducting block network IS the program. Rune blocks ARE the instructions. When a signal reaches a junction, it splits — parallel execution. When it hits a Hagalaz gate, it branches — conditional execution. When it enters an Isa block, it pauses — sequential timing.

The world IS the source code. The player debugs by watching signal propagation ripple through their network in real time (thanks to the slow tick). They can literally see their program execute.

### Discovery Progression for Computational Runes

The three new computational runes are discovered later in the game, rewarding exploration:

| Rune | Discovery Method | Metaphor |
|------|-----------------|----------|
| ᚾ Naudiz | Find a ruin where a door *opens* when a sensor *loses* its target — absence triggers action | "Need reveals itself in what is missing" |
| ᛁ Isa | Observe ice forming on a river — water signal delayed by cold, released in spring thaw | "Ice holds, then releases" |
| ᚺ Hagalaz | Survive a hailstorm where lightning only strikes where rain AND wind converge — conditional destruction | "Hail falls only where storm paths cross" |

Players discover NOT, DELAY, and AND through world observation — the same way they discover all other runes. The computational primitives are cloaked in nature metaphors. A player who builds a clock oscillator isn't "programming" — they're "inscribing a heartbeat."

### Why This Beats Redstone

| Aspect | Minecraft Redstone | Bok Runic Computation |
|--------|-------------------|----------------------|
| **Design intent** | Accidental Turing completeness | Intentional from day one |
| **Metaphor** | Electrical engineering (wires, torches, repeaters) | Norse inscription (runes, sagas, living stone) |
| **Signal model** | Binary (on/off, 0-15 power) | Typed + strength (heat/light/force/detection × 0-15) |
| **Multiplexing** | One signal per wire | Multiple signal types per conductor |
| **Conditional** | Comparator (obscure, late-game) | Hagalaz (intuitive gate, mid-game discovery) |
| **Visual feedback** | Red dust on ground | Glowing runes, particle trails through 3D space |
| **Mobile-friendly** | No (precision placement, tiny wires) | Yes (tap-inscribe, slow tick, visible propagation) |
| **Dual purpose** | Computation OR gameplay (rarely both) | Every computational primitive also has direct gameplay use |

The last point is critical. Every computational rune also serves gameplay directly:
- Naudiz (NOT) is also a "darkness alarm" — it signals when your light source dies
- Isa (DELAY) is also a "timed trap" — delay damage for dramatic effect
- Hagalaz (GATE) is also a "safety lock" — only activate the forge when YOU are present

Players use these runes for practical purposes long before they realize they can compose a CPU.

## Destructive & Constructive Logic

Block placement and removal are not just building — they are **write operations** on the computational substrate.

### Block Presence as State

A conducting block in a signal path is a closed circuit. Remove it, the circuit breaks. Place it back, the circuit closes. This binary — block/air — is the most primitive form of memory. But combined with rune-etched faces, it becomes powerful:

- **Physical switch**: Place/remove a block to toggle a rune circuit on/off. The player's hand is the input device.
- **Fuse**: A wood block in a signal path that carries a Kenaz (heat) signal. The heat burns the wood. The block is consumed. The circuit breaks. One-shot logic — a self-destroying fuse.
- **Self-modifying circuits**: A Jera (transform) rune that converts air→stone or stone→air when signaled. The circuit rewrites its own wiring. A rune network can **place and remove blocks**, changing its own topology while running.

### The Brainfuck Parallel

Brainfuck has 8 instructions, a tape, and a pointer. Our system has:

| Brainfuck | Runic Equivalent |
|-----------|-----------------|
| `>` `<` (move pointer) | Signal propagation through conductor faces |
| `+` `-` (increment/decrement) | Signal strength modification through material |
| `[` `]` (loop while nonzero) | Feedback paths through Isa (delay) loops |
| `.` `,` (output/input) | Effect runes (Thurisaz/damage, Sowilo/light, Fehu/pull) + Ansuz (sense) |

But the face-etching system goes far beyond brainfuck's 1D tape:
- **3D tape**: The world volume is the memory space
- **Multi-head**: Multiple signals traverse simultaneously
- **Self-modifying**: Jera runes can rewrite the tape (place/remove blocks)
- **Typed channels**: Heat, light, force, detection — four independent instruction streams multiplexed on the same conductor

A line of blocks with face-etched runes is a program. The signal is the instruction pointer. The block faces are the instructions. The world is both the code AND the data. This is **reflection** — the program can inspect and modify itself.

### Write Runes (Block Manipulation)

Two runes enable self-modifying circuits:

| Rune | Face Behavior | Description |
|------|--------------|-------------|
| ᛃ Jera (on exit face) | **PLACE(blockType)** | When signal exits this face into air, places a block of the specified type. Consumes signal strength proportional to block hardness. |
| ᚦ Thurisaz (on exit face) | **DESTROY(facing)** | When signal exits this face into a block, removes that block. Produces particles. Destructive write. |

Combined: a circuit that senses (Ansuz), decides (Hagalaz gate), and acts (Jera places, Thurisaz removes) — building and demolishing blocks autonomously. The settlement builds and repairs itself.

## The Tomte (Tutorial Companion)

In Swedish folklore, the **Tomte** (plural: Tomtar) is the farmstead guardian — a small, ancient gnome who lives under the floorboards and protects the home. He is grumpy, loyal, and deeply knowledgeable about the old ways. Disrespect him (forget to leave porridge on Christmas Eve) and he'll cause havoc. Respect him and he'll guard your stuga through the darkest winter nights.

### Role in Bok

The Tomte is the player's **diegetic tutorial**. He is not a floating tooltip or a quest marker. He is a character who lives in the world and teaches through demonstration.

### Behavior Arc

**Day 1 — The Introduction**
The Tomte is waiting at the spawn stenhög when the player awakens. He is small (0.5 blocks tall), wearing a red pointed cap, with a long white beard. He stands on the runestone and watches the player. When the player approaches, he hops down and walks to a nearby stone block.

He pulls out a tiny chisel. He etches ᚲ (Kenaz) onto the stone. The stone glows with warmth. He points at the glow, then at the player, then at the chisel he leaves on the ground.

No text. No tooltip. The player understands: *pick up the chisel, carve the rune, make warmth.*

**Days 2-5 — Face Etching**
The Tomte appears near the player's builds. He examines their rune work. If the player has only etched single faces, the Tomte demonstrates multi-face etching — he walks to a block, etches one rune on the north face, a different rune on the east face, then stands back to watch the signal split and transform. He nods with satisfaction.

The Tomte teaches the tap-and-wheel method first. After the player has etched 3+ distinct runes, the Tomte demonstrates drag-to-etch — he drags his chisel across a face in a rune pattern, faster than the wheel method. The player unlocks expert mode.

**Days 5-15 — Computational Discovery**
The Tomte occasionally builds small demonstration circuits near the player's settlement:
- A Naudiz inverter (he activates it, shows the inverted output, disassembles it)
- An Isa delay loop (he watches the signal circle, counts on his fingers, grins)
- A Hagalaz gate (he blocks one input, shows the output stop, unblocks it, output resumes)

He never builds anything the player has already built. He fills gaps in the player's knowledge.

**Days 15+ — Settlement Guardian**
The Tomte settles into the player's settlement. He sleeps by the hearth. He tends a small mushroom garden. He examines new rune machines the player builds — if they're novel (topology the Tomte hasn't seen), he inspects them with visible curiosity and scratches his beard. If they're dangerous (self-modifying circuits that destroy blocks chaotically), he retreats to his mushroom garden and hides.

The Tomte is a **living indicator** of the player's runic sophistication. His behavior reflects what you've built.

### Construction

The Tomte is a multi-part building-block creature following the creature design language:

- **Body**: Small rounded box (0.4 blocks wide, 0.5 tall)
- **Head**: Sphere (0.25 blocks), oversized relative to body
- **Cap**: Red cone on top of head, floppy tip (spring physics)
- **Beard**: Chain of 3 small white boxes dangling from chin (spring physics)
- **Legs**: 2 short stubby capsules with simple IK
- **Chisel**: Tiny held item (thin box) when teaching

Colors: Body in earth brown, cap in Falu red `#8b2500`, beard in Björk white `#e0d5c1`.

### The Tomte and the Saga

The Tomte's presence is recorded in the Sagan:
- *"Day 1 — A tomte watches from the stenhög. He has been here longer than the stones."*
- *"Day 3 — The tomte showed how fire runes speak in two directions."*
- *"Day 20 — The tomte examined the clock-circuit and laughed. First time I've heard him laugh."*

### Adding the Tomte to Creatures

The Tomte is a unique entity — there is only one per world. He is not a species in the creature system but a **named singleton** with his own AI state machine:

| State | Behavior | Trigger |
|-------|----------|---------|
| **Watching** | Follows player at distance, observes | Default early game |
| **Teaching** | Walks to block, demonstrates rune etching | Player hasn't discovered a rune the Tomte knows |
| **Examining** | Inspects player's rune builds, reacts | Player builds novel circuit topology |
| **Settling** | Stays near hearth, tends garden, sleeps | Settlement has a Hearth archetype |
| **Hiding** | Retreats to safe spot, covers eyes | Chaotic self-modifying circuits or Mörker nearby |
| **Celebrating** | Dances, throws cap in air | Player achieves Settlement archetype |

## Implementation Phases

### Phase A — Signal Foundation
- Face-based rune inscription mechanic (chisel + tap face + rune wheel)
- Per-face rune storage in chunk spatial index (`Map<voxelKey, Map<faceIndex, RuneId>>`)
- Signal propagation BFS on slow tick with face-direction awareness
- Kenaz (heat emitter) + Sowilo (light emitter)
- Stone/iron conduct, wood insulates
- Visual feedback: etched faces glow with rune color, signal propagation shown as subtle particle trails
- Internal face support (runes on faces between adjacent blocks)
- X-ray view for inspecting internal faces (long-press with chisel)

### Phase B — Interaction Behaviors
- Jera (transform) — ore + heat → ingot, wood + heat → charcoal
- Fehu (pull) — item collection radius
- Ansuz (sense) — creature detection trigger
- Thurisaz (damage) — signal-activated trap

### Phase C — Protection & Territory
- Algiz (ward) — hostile exclusion zone
- Mannaz (calm) — creature taming
- Berkanan (grow) — nature acceleration
- Archetype recognition (Hearth, Workshop, Ward)
- Settlement founding

### Phase D — Computation & Self-Modification
- Naudiz (invert) — NOT gate, darkness alarm
- Isa (delay) — signal timing, timed traps
- Hagalaz (gate) — conditional signal routing, AND gate
- Feedback loop detection and stable oscillator support
- Destructive/constructive logic: Jera block placement, Thurisaz block removal
- Self-modifying circuit support (circuits that alter their own topology)
- Drag-to-etch expert mode unlock
- Player discovers computational composition through gameplay

### Phase E — Network & Scale
- Raido (teleport) — paired fast travel
- Crystal amplification
- Uruz (push) — entity displacement
- Tiwaz (buff) — combat enhancement
- Full settlement growth system
- Inter-chunk signal bridges via Raido

### Phase F — The Tomte
- Tomte entity: singleton companion with state machine AI
- Teaching behavior: demonstrates rune etching, face selection, multi-face builds
- Progressive tutorial: tap+wheel first, drag-to-etch unlock after 3+ runes
- Settlement integration: Tomte settles at hearth, reacts to player builds
- Sagan integration: Tomte milestones recorded in the saga

### Phase G — Emergence
- Player-discovered compound behaviors not anticipated by designers
- Kunskapen records player-invented machines (auto-detects novel circuit topologies)
- Other players' settlement designs discoverable as Fornlämningar in new worlds (stretch: ghost archaeology)
- Community-shared rune programs as "saga fragments"

## Rune Discovery

Runes are NOT available from the start. The player discovers them through the world:

| Rune | Discovery Method |
|------|-----------------|
| ᚲ Kenaz | Tutorial — the Tomte demonstrates by etching it onto the spawn stenhög stone |
| ᛊ Sowilo | Dawn observation — watch a full sunrise cycle |
| ᚠ Fehu | Drop items near a runestone — observe them slide toward it |
| ᚨ Ansuz | Observe a Runväktare activate when you enter a ruin |
| ᛉ Algiz | Find a protected zone around a Fornlämning — analyze why Mörker avoid it |
| ᛃ Jera | Watch a Skogssnigel transform grass into mushroom — nature's Jera |
| ᚦ Thurisaz | Get damaged by a ruin trap — survive and learn |
| ᚢ Uruz | Observe Lindormar pushing through earth — force in motion |
| ᛒ Berkanan | Find a grove where trees grow faster near a runestone |
| ᛗ Mannaz | Observe Vittra near their mound — peace from presence |
| ᚱ Raido | Find two linked runestones — step on one, appear at the other |
| ᛏ Tiwaz | Defeat an enemy near a war-inscribed runestone — feel the boost |
| ᚾ Naudiz | Find a ruin where a door opens when a sensor loses its target — absence triggers action |
| ᛁ Isa | Observe ice forming on a river — water signal delayed by cold, released in spring thaw |
| ᚺ Hagalaz | Survive a hailstorm where lightning strikes only where rain AND wind converge |

Each discovery is recorded in the Kunskapen page of the Bok. The player can then inscribe that rune onto blocks.

## Why This Works for Mobile

1. **Slow tick** — computation isn't per-frame, so phone GPUs aren't stressed
2. **Small networks** — 16-block max propagation depth means networks stay manageable
3. **Visual feedback** — glowing runes and particle trails make invisible signals visible on small screens
4. **Touch-friendly** — inscribing is tap-and-hold on a block, select rune from wheel. No precision needed.
5. **Session-friendly** — build a 3-block machine in 2 minutes and see it work. Expand it over many sessions.
6. **Discoverable** — rune discovery through observation is perfect for bus-ride sessions. Watch, learn, close the app. Come back and inscribe.

## Relation to Previous Pattern-Matching

The previous structures.md described pattern-matched workstations (exact block arrangements). This system **supersedes** it. There are no prescribed patterns — only behaviors and their composition. The game recognizes **functional capability** (archetype), not **physical shape**.

A "forge" is anything that delivers heat to a transformer. A "settlement" is anything that combines shelter, crafting, and defense. The player's creativity is unbounded within the rule set.

Shelter detection (enclosed volume → bonus) remains as described — it's a spatial property of block arrangement, not a signal behavior. Territory strength (density field from player blocks) also remains as a separate spatial system. These are complementary to the runic computation, not replaced by it.
