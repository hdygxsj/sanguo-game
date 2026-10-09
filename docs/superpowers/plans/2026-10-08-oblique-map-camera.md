# Oblique map camera

Goal: show real 3D assets from a 2.5D orthographic angle without changing gameplay coordinates.

Design: preserve the existing orthographic camera and input ray projection. Use a fixed 25-degree azimuth and smoothly interpolate elevation from 60 degrees at overview to 35 degrees at close range using the existing relief transition. Compute the overview fit from the rotated map bounds, then multiply by continuous zoom. Preserve the existing cursor anchor correction, focus target, selection and WebGL fallback.

Alternatives: a fixed 35-degree camera compresses the political overview too strongly; perspective changes relative model sizes and needs additional control changes. Retain orthographic projection with a continuous angle instead.

Implementation in this session (user requested autonomous execution):

- [x] Add mapCamera.test.ts: oblique angles, overview corner fit in landscape/portrait, centre preservation, continuous reversible transition. Confirmed missing implementation failure before implementation.
- [x] Add mapCamera.ts with configurable elevation/azimuth/distance and reuse transitionAt. Integrated its pose and projected-bound fit into CameraRig; initialized Canvas with the same oblique offset.
- [x] Frontend: 172 tests passed, production build passed. In-app browser screenshots checked overview and 30.4× near view: map fits and building facades are visible. Existing fallback and gameplay unchanged. External Chrome 3D remains dependent on working WebGL.
