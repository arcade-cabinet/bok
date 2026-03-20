# Security — Bok

## Input Validation
- All content JSON validated by Zod schemas at load time
- User input (seeds, settings) sanitized before SQLite queries
- SQLite uses parameterized queries — no string interpolation

## Capacitor Permissions
- Storage: read/write for save files
- No network permissions required (single-player)
- No camera/microphone/location access

## Dependencies
- All dependencies are MIT/Apache-2.0 licensed
- npm audit run as part of CI
