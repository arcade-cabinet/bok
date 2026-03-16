# Mobile-First Design

## Philosophy

Bok is **mobile-first**. Not "mobile-compatible" — mobile is the primary platform. Desktop is the enhanced experience. Every design decision starts with "how does this work on a phone held in one hand on a bus?"

This means:
- **Touch is the primary input.** Mouse/keyboard are enhancements.
- **Sessions are short.** 5 minutes must feel complete.
- **Battery matters.** Rendering budget is limited.
- **Screen is small.** UI must be minimal and thumb-reachable.
- **Network is unreliable.** Everything works offline.

## Input Design

### Touch Zones

```
┌─────────────────────────────────┐
│  Time/Day          Quest Info   │  ← Status (read-only, small text)
│                                 │
│                                 │
│                                 │
│   [LEFT ZONE]    [RIGHT ZONE]   │  ← Camera + interaction
│   Movement       Free-look      │
│   Joystick       + Mine/Place   │
│                                 │
│              [VITALS]           │
│           [═══ HOTBAR ═══]      │  ← Bottom center
│  [JUMP]                 [BOK]   │  ← Action buttons in thumb zone
└─────────────────────────────────┘
```

### Thumb Zone Compliance
All interactive elements must fall within the natural thumb arc:
- **Bottom 40%** of screen: Primary actions (move, attack, jump, inventory)
- **Top 20%**: Read-only status (time, quests — no interaction needed)
- **Middle 40%**: Game viewport (touch here for camera control)

### Gesture Vocabulary
| Gesture | Action |
|---------|--------|
| Left thumb drag | Move (virtual joystick) |
| Right thumb drag | Camera look |
| Right tap | Mine / Attack |
| Right double-tap | Place block |
| Swipe up (right side) | Jump |
| Long press (right side) | Continuous mine |
| Two-finger pinch | Zoom (future, for map view) |
| Swipe from bottom edge | Open Bok |

### Haptic Feedback
- **Light tap**: Block placed, item crafted
- **Medium pulse**: Block broken, creature hit
- **Heavy thud**: Damage taken, creature attack
- **Rhythmic pulse**: Mining in progress (synced to swing animation)

## UI Principles

### 1. Minimum Chrome
The HUD should show the absolute minimum at all times:
- **Always visible**: Hotbar (5 slots), vitals (3 tiny bars)
- **Contextual**: Mining progress (only when mining), quest hint (fades after reading)
- **On demand**: Bok (full inventory/crafting/map)
- **Never**: Minimap (use landmarks), coordinates (use landmarks), FPS counter

### 2. Thumb-Sized Targets
Every interactive element: **minimum 48x48 CSS pixels**. Hotbar slots, Bok button, action buttons. No tiny icons, no hover states (no hover on mobile).

### 3. Landscape-Only
Bok is landscape orientation only. This maximizes the viewport for a 3D world and keeps both thumbs available for input.

### 4. Progressive Disclosure
- First play: Only move joystick and mine button visible
- After first block mined: Hotbar appears
- After first night: Vitals appear
- After first craft: Bok button appears

New UI elements are introduced as the player needs them, not dumped all at once.

### 5. Glanceable Status
All status information uses **visual metaphors, not numbers**:
- Health: Red bar (percentage visible, not number)
- Hunger: Warm bar (desaturates as it depletes)
- Stamina: Cool bar (pulses when low)
- Time: Sky color itself (no clock needed, but sun/moon position in the diegetic world)

## Performance Budget

### Target: 30fps on mid-range phones (2022 hardware)

| System | Budget |
|--------|--------|
| Draw calls | < 50 per frame |
| Triangles | < 100K visible |
| Texture memory | < 128MB |
| Particle count | < 200 (vs 500 on desktop) |
| Chunk render distance | 2 (vs 3 on desktop) |
| Shadow map | 512x512 (vs 1024x1024 on desktop) |
| Enemy mesh pool | 8 (vs 16 on desktop) |

### Adaptive Quality
Detect device capability on startup and adjust:
- **Low**: No shadows, 1 chunk render distance, 100 particles, no ambient particles
- **Medium**: Simple shadows, 2 chunks, 200 particles, reduced ambient
- **High**: Full shadows, 3 chunks, 500 particles, full ambient (desktop default)

### Battery Awareness
- Reduce frame rate to 24fps when battery < 20%
- Disable ambient particles when battery < 15%
- Auto-save and suggest break when battery < 10%

## Offline-First Architecture

The game is a **static site** deployed to GitHub Pages. Everything runs client-side:
- No server calls during gameplay
- SQLite database is local (IndexedDB-backed via Capacitor SQLite)
- World generation is deterministic from seed
- Save/load is instant (no network)
- The entire game loads in a single page load (PWA-cacheable)

### PWA Support (Future)
- Service worker for offline caching
- Add to Home Screen prompt
- App-like experience without app store
- Push notifications for "your world is decaying" reminders (stretch)

## Capacitor Native Path

The architecture supports deploying as a native app via Capacitor:
- **iOS/Android**: Full native app with `@capacitor-community/sqlite` using native SQLite
- **Web**: jeep-sqlite wrapper with IndexedDB persistence
- **Same codebase**: No platform-specific game code

Native advantages:
- Better SQLite performance (no WASM overhead)
- Native haptics API
- Push notifications
- App store distribution
- Background audio

## Session Design

### The 5-Minute Session
A mobile player on transit should be able to:
1. Open game (< 3 second load)
2. Continue from last save (auto-loaded)
3. Do one meaningful thing (mine, build, explore, fight)
4. Auto-save triggers (every 60 seconds + on app background)
5. Close game without loss

### The 30-Minute Session
A player on a couch or break should be able to:
1. Complete a full explore → exploit → expand cycle
2. Discover a new area or creature
3. Build a meaningful addition to their settlement
4. Experience at least one day/night transition

### Save Points
- **Auto-save**: Every 60 seconds while playing
- **Background save**: When app loses focus (visibilitychange event)
- **Milestone save**: On quest completion, structure recognition, creature defeat
- **No manual save needed**: The player never has to think about saving
