#!/usr/bin/env bash
# Generate app icons and splash screens from SVG sources.
# Requires: rsvg-convert (librsvg) — install via `brew install librsvg`
#
# Usage: bash scripts/generate-assets.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES="$PROJECT_DIR/resources"
ICON_SVG="$RESOURCES/icon.svg"
SPLASH_SVG="$RESOURCES/splash.svg"

if ! command -v rsvg-convert &>/dev/null; then
  echo "ERROR: rsvg-convert not found. Install with: brew install librsvg"
  exit 1
fi

# ─── iOS App Icons ───
IOS_ICONS="$PROJECT_DIR/ios/App/App/Assets.xcassets/AppIcon.appiconset"
if [ -d "$PROJECT_DIR/ios" ]; then
  mkdir -p "$IOS_ICONS"
  for size in 20 29 40 58 60 76 80 87 120 152 167 180 1024; do
    rsvg-convert -w "$size" -h "$size" "$ICON_SVG" > "$IOS_ICONS/icon-${size}.png"
    echo "  iOS icon: ${size}x${size}"
  done

  # Generate Contents.json for Xcode
  cat > "$IOS_ICONS/Contents.json" << 'CONTENTS'
{
  "images": [
    { "filename": "icon-40.png", "idiom": "universal", "platform": "ios", "size": "20x20", "scale": "2x" },
    { "filename": "icon-60.png", "idiom": "universal", "platform": "ios", "size": "20x20", "scale": "3x" },
    { "filename": "icon-58.png", "idiom": "universal", "platform": "ios", "size": "29x29", "scale": "2x" },
    { "filename": "icon-87.png", "idiom": "universal", "platform": "ios", "size": "29x29", "scale": "3x" },
    { "filename": "icon-80.png", "idiom": "universal", "platform": "ios", "size": "40x40", "scale": "2x" },
    { "filename": "icon-120.png", "idiom": "universal", "platform": "ios", "size": "40x40", "scale": "3x" },
    { "filename": "icon-120.png", "idiom": "universal", "platform": "ios", "size": "60x60", "scale": "2x" },
    { "filename": "icon-180.png", "idiom": "universal", "platform": "ios", "size": "60x60", "scale": "3x" },
    { "filename": "icon-152.png", "idiom": "universal", "platform": "ios", "size": "76x76", "scale": "2x" },
    { "filename": "icon-167.png", "idiom": "universal", "platform": "ios", "size": "83.5x83.5", "scale": "2x" },
    { "filename": "icon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024", "scale": "1x" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
CONTENTS
  echo "iOS icons generated."
else
  echo "Skipping iOS icons (ios/ directory not found — run 'npx cap add ios' first)"
fi

# ─── Android App Icons ───
if [ -d "$PROJECT_DIR/android" ]; then
  declare -A ANDROID_SIZES=(
    ["mdpi"]=48
    ["hdpi"]=72
    ["xhdpi"]=96
    ["xxhdpi"]=144
    ["xxxhdpi"]=192
  )

  for density in "${!ANDROID_SIZES[@]}"; do
    size="${ANDROID_SIZES[$density]}"
    dir="$PROJECT_DIR/android/app/src/main/res/mipmap-${density}"
    mkdir -p "$dir"
    rsvg-convert -w "$size" -h "$size" "$ICON_SVG" > "$dir/ic_launcher.png"
    rsvg-convert -w "$size" -h "$size" "$ICON_SVG" > "$dir/ic_launcher_round.png"
    rsvg-convert -w "$size" -h "$size" "$ICON_SVG" > "$dir/ic_launcher_foreground.png"
    echo "  Android icon: ${density} (${size}x${size})"
  done
  echo "Android icons generated."
else
  echo "Skipping Android icons (android/ directory not found — run 'npx cap add android' first)"
fi

# ─── Splash Screens ───
if [ -d "$PROJECT_DIR/ios" ]; then
  SPLASH_DIR="$PROJECT_DIR/ios/App/App/Assets.xcassets/Splash.imageset"
  mkdir -p "$SPLASH_DIR"
  rsvg-convert -w 2732 -h 2732 "$SPLASH_SVG" > "$SPLASH_DIR/splash-2732x2732.png"
  rsvg-convert -w 1242 -h 2688 --keep-aspect-ratio "$SPLASH_SVG" > "$SPLASH_DIR/splash-1242x2688.png"
  cat > "$SPLASH_DIR/Contents.json" << 'CONTENTS'
{
  "images": [
    { "filename": "splash-2732x2732.png", "idiom": "universal", "scale": "1x" },
    { "filename": "splash-1242x2688.png", "idiom": "universal", "scale": "2x" },
    { "filename": "splash-2732x2732.png", "idiom": "universal", "scale": "3x" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
CONTENTS
  echo "iOS splash screens generated."
fi

if [ -d "$PROJECT_DIR/android" ]; then
  SPLASH_DIR="$PROJECT_DIR/android/app/src/main/res/drawable-land-xxxhdpi"
  mkdir -p "$SPLASH_DIR"
  rsvg-convert -w 2732 -h 2732 "$SPLASH_SVG" > "$SPLASH_DIR/splash.png"
  SPLASH_PORT="$PROJECT_DIR/android/app/src/main/res/drawable-port-xxxhdpi"
  mkdir -p "$SPLASH_PORT"
  rsvg-convert -w 1242 -h 2688 --keep-aspect-ratio "$SPLASH_SVG" > "$SPLASH_PORT/splash.png"
  echo "Android splash screens generated."
fi

# ─── PWA Icon (used by web manifest) ───
rsvg-convert -w 512 -h 512 "$ICON_SVG" > "$PROJECT_DIR/public/icon-512.png"
rsvg-convert -w 192 -h 192 "$ICON_SVG" > "$PROJECT_DIR/public/icon-192.png"
echo "PWA icons generated."

echo "Done! Source 1024x1024 icon at: $ICON_SVG"
