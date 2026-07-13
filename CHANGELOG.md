# Changelog

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

### Breaking

- `Nitro.bootstrap()` is asynchronous and must now be awaited before consumers
  access `Nitro.instance`:

  ```ts
  await Nitro.bootstrap();
  ```

The `@nitrots/nitro-renderer/standalone` API keeps its existing signatures.
