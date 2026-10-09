#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mode="${1:-all}"
if [[ "$mode" != all && "$mode" != props ]]; then
  echo "Usage: bash scripts/build-assets.sh [all|props]" >&2
  exit 2
fi

python3 assets/blender/test_roofs.py
python3 assets/blender/test_masonry.py

BLENDER_BIN="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
if [[ ! -x "$BLENDER_BIN" ]] && [[ -x "/tmp/agent-arena-blender/Blender.app/Contents/MacOS/Blender" ]]; then
  BLENDER_BIN="/tmp/agent-arena-blender/Blender.app/Contents/MacOS/Blender"
fi
if [[ ! -x "$BLENDER_BIN" ]] && [[ -x "/Volumes/Blender/Blender.app/Contents/MacOS/Blender" ]]; then
  BLENDER_BIN="/Volumes/Blender/Blender.app/Contents/MacOS/Blender"
fi

if [[ ! -x "$BLENDER_BIN" ]]; then
  echo "Blender executable not found. Set BLENDER_BIN to Blender 4.5+." >&2
  exit 1
fi

if [[ "$mode" == all ]]; then
  "$BLENDER_BIN" --background --factory-startup --python-exit-code 1 --python assets/blender/build_arena.py
  "$BLENDER_BIN" --background assets/blender/arena-kit.blend --python-exit-code 1 --python assets/blender/verify_arena.py
  "$BLENDER_BIN" --background --factory-startup --python-exit-code 1 --python assets/blender/render_preview.py
  "$BLENDER_BIN" --background --factory-startup --python-exit-code 1 --python assets/blender/render_catalog.py
fi

# Keep the CLI version pinned. Runtime already ships the Draco decoder.
for pair in horse:pasture-horse quarry:quarry-outcrop infantry:han-infantry infantry:han-archer infantry:han-swordsman cavalry:han-cavalry forest:shan-shui-pine; do
  source_name="${pair%%:*}"
  asset_name="${pair#*:}"
  extra_args=()
  if [[ "$asset_name" == han-archer ]]; then extra_args=(-- --archer); fi
  if [[ "$asset_name" == han-swordsman ]]; then extra_args=(-- --sword); fi
  "$BLENDER_BIN" --background --factory-startup --python-exit-code 1 --python "assets/blender/build_${source_name}.py" "${extra_args[@]}"
  asset_path="apps/web/public/models/agent-arena/${asset_name}.glb"
  pnpm exec gltf-transform dedup "$asset_path" "${asset_path}.dedup.glb"
  pnpm exec gltf-transform draco "${asset_path}.dedup.glb" "$asset_path"
  # Only remove the exact intermediate generated above.
  rm "${asset_path}.dedup.glb"
done
node scripts/test-infantry-asset.mjs
node scripts/test-prop-assets.mjs
