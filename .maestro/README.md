# Maestro E2E Tests

## Prerequisites

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Start dev server with network access (for simulators)
npx vite --port 5174 --host 0.0.0.0
```

## Running Tests

```bash
# Web smoke test (Chromium)
maestro test .maestro/flows/web-smoke.yaml

# iOS full journey (requires iOS simulator)
maestro test .maestro/flows/ios-full-journey.yaml

# Creative mode verification
maestro test .maestro/flows/creative-mode.yaml

# All flows
maestro test .maestro/flows/
```

## Notes

- Cinzel font renders as visual small caps — Maestro text matching uses the HTML text content
- WebGL hub won't render in headless Chromium — use iOS simulator for 3D tests
- Set `NETWORK_URL` to your local IP for simulator access
- The PWA service worker may cache old versions — append `?v=timestamp` to bust cache
