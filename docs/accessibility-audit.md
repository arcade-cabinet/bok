# Accessibility Audit — Bok

WCAG 2.1 AA compliance audit for all UI components.

## Applied Improvements

### ARIA Labels & Roles
- All icon-only buttons have `aria-label` attributes (hotbar slots, bok pages, rune wheel)
- Modals (`NewGameModal`, `BokScreen`) have `role="dialog"` and `aria-modal="true"`
- Decorative SVG/canvas elements have `aria-hidden="true"`
- Game state changes (health, hunger, quest) announced via `aria-live="polite"` regions

### Touch Targets
- All interactive elements >= 44×44px (mobile-first requirement enforced in `MobileControls`)
- Hotbar slots: 48px minimum, rune wheel sectors >= 44px arc height
- BokIndicator toggle button: 48×48px touch target

### Color Contrast
- Body text minimum 4.5:1 contrast ratio (WCAG AA) against backgrounds
- VitalsBar color coding supplemented with icon indicators (not color alone)
- DamageVignette uses opacity-only (no color-alone signaling)
- HungerOverlay: darkening effect not relied on as sole indicator

### Keyboard Navigation
- Bok screen pages navigable via arrow keys and Tab
- All dialog close actions mapped to Escape key
- Hotbar slot selection mapped to 1–9 keys
- `perf-monitor.ts` toggle: Shift+P (keyboard shortcut documented)

### Reduced Motion
- `ParticlesBehavior` checks `prefers-reduced-motion` and skips non-essential particles
- CSS transitions use `@media (prefers-reduced-motion: reduce)` override
- Screen shake / damage vignette animations suppressed under reduced motion

### Semantic HTML
- All buttons have explicit `type="button"` to prevent accidental form submission
- HUD overlay elements use `<output>` or `<status>` roles where state changes
- Canvas has `aria-label="Bok game world"` and `role="application"`

## Audit Status

| Category | Status |
|---|---|
| Color contrast (4.5:1) | Pass |
| Touch targets >= 44px | Pass |
| Keyboard navigation | Pass |
| ARIA roles/labels | Pass |
| Reduced motion | Pass |
| Semantic HTML | Pass |
