# Changelog

## Unreleased

### Added

- Added optional RSA-signed Diffie-Hellman negotiation and independent
  client/server RC4 streams for compatibility with Pixels and legacy Habbo
  protocol servers.
- Added renderer configuration for the public RSA modulus and exponent while
  keeping the server private exponent out of browser bundles.

## 3.0.3 - 2026-07-13

### Fixed

- Rebuilt room sprite hit maps at the texture source resolution instead of the
  Retina renderer resolution, restoring accurate clicks on furniture and room
  tiles.
- Restored per-sprite alpha tolerance, including explicit all-pixel click
  targets, and removed half-pixel rounding drift from hit-map lookups.

## 3.0.2 - 2026-07-13

### Fixed

- Matched the room-canvas mask to the stable PixiJS 8 sprite-mask path used by
  Nitro Render V3, preventing resized room and inventory-preview canvases from
  being clipped to an empty graphics mask.

## 3.0.1 - 2026-07-13

### Fixed

- Prevented pooled room sprites from passing `null` into PixiJS 8's `Sprite`
  constructor, which stopped the room render loop before any object was drawn.
- Migrated the remaining legacy `TilingSprite(texture, width, height)` call to
  the PixiJS 8 options-object constructor.
- Disabled automatic child culling on the room scene containers and completed
  the `name` to `label` migration used by sprite hit detection.

## 3.0.0 - 2026-07-13

### Changed

- Migrated the renderer from PixiJS 7.4 to PixiJS 8.19 and `@pixi/tilemap` 5.0.
- Replaced split `@pixi/*` packages with the unified `pixi.js` package.
- Migrated application initialization, rendering, graphics, extraction, filters,
  texture sources, spritesheets and blend modes to their PixiJS 8 APIs.
- Decodes `.nitro` and downloaded image assets through `createImageBitmap` and
  PixiJS `ImageSource` instead of base64 URLs.
- Updated scene containers so sprites are no longer used as generic child hosts.
- Added PixiJS 8 texture-pipeline coverage for Nitro bundles and spritesheets.

### Fixed

- Restored the legacy `view` canvas alias while consumers migrate to PixiJS 8's
  `canvas` property, preventing non-Node values from reaching `appendChild`.
- Preserved numeric `NitroAlphaFilter` construction and subclass initialization
  through the asynchronous `PixiApplicationProxy.ready` contract.
- Camera overlays now decode fetched images directly instead of probing Pixi's
  asset cache for URL-backed textures.

### Breaking

- `Nitro.bootstrap()` is asynchronous and must now be awaited before consumers
  access `Nitro.instance`:

  ```ts
  await Nitro.bootstrap();
  ```

The `@nitrots/nitro-renderer/standalone` API keeps its existing signatures.
