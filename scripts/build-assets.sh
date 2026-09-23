#!/usr/bin/env bash
set -euo pipefail

BLENDER_BIN="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
if [[ ! -x "$BLENDER_BIN" ]] && [[ -x "/tmp/agent-arena-blender/Blender.app/Contents/MacOS/Blender" ]]; then
  BLENDER_BIN="/tmp/agent-arena-blender/Blender.app/Contents/MacOS/Blender"
fi

if [[ ! -x "$BLENDER_BIN" ]]; then
  echo "Blender executable not found. Set BLENDER_BIN to Blender 4.5+." >&2
  exit 1
fi

"$BLENDER_BIN" --background --factory-startup --python assets/blender/build_arena.py
"$BLENDER_BIN" --background assets/blender/arena-kit.blend --python assets/blender/verify_arena.py
"$BLENDER_BIN" --background --python assets/blender/render_preview.py
