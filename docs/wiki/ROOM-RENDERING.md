# Room Rendering

[[ROOM-ENGINE]] covers the data model; this page covers how that data becomes pixels — the sprite cache, isometric depth sorting, the rasterizer performance trick, and the full render chain end to end.

## `RoomSpriteCanvas` — the render target

`RoomSpriteCanvas` (`src/room/renderer/RoomSpriteCanvas.ts`) is the PixiJS-facing renderer for one room "canvas". A room can have more than one canvas at once — e.g. the main view plus a thumbnail/preview canvas — each with its own scale and geometry.

**Sprite cache.** `RoomObjectCache` maps object-identifier strings to `RoomObjectCacheItem`, each holding a cached screen position (invalidated when the geometry or the object's own update counter changes) and the flat list of `SortableSprite`s that object currently contributes. Every render pass, `renderObject()` fetches or creates this cache entry, asks the object's visualization to update (subject to the animation-fps gate — see [[TIMING-AND-ANIMATION]]), and allocates/reuses a `SortableSprite` per visible sprite the visualization produces.

**Depth sorting.** Each `SortableSprite` carries `x`, `y`, `z`. The base `z` comes from `RoomGeometry.getScreenPosition`'s depth-axis projection, plus a per-sprite relative-depth offset and tiny deterministic jitter values to break ties at equal depth. Every frame, all sprites across all objects are collected and sorted:

```ts
this._sortableSprites.sort((a, b) => (b.z - a.z));
```

Farther-from-camera sprites have larger projected depth in this convention, so descending sort yields back-to-front painter's-algorithm order — exactly what isometric rendering needs (a wall behind a chair must be drawn before the chair). The sorted list is then walked to sync pooled Pixi sprite children in that order, reusing objects rather than recreating them each frame.

**Canvas mask.** `RoomSpriteCanvas` maintains a mask sprite clipping content to the visible rectangle. `RoomEngine.setRoomInstanceRenderingCanvasMask(roomId, canvasId, flag)` toggles it — this is exposed because thumbnail/screenshot capture often wants the *unclipped* full room rather than a clipped viewport (see [[STANDALONE-RENDERING]]'s room imaging, which disables the mask before capturing).

**Producing output.** `getRoomInstanceDisplay()` returns `canvas.master`, the top-level `Container` you add into a live Pixi scene graph. For a one-off still image, `getDisplayAsTexture()` temporarily disables culling and the mask, forces a full re-render at scale 1, computes tight bounds, and renders into a fresh `RenderTexture` — this is the method behind every screenshot/thumbnail feature in the engine, including the standalone room imaging facade.

## Why rasterizers exist

A naive renderer would draw one sprite per floor tile and tile a repeating texture along every wall segment — a 10×10 room floor alone is a hundred individual diamond sprites, re-evaluated every frame. Instead, each contiguous floor/wall/landscape *plane* extracted by `RoomPlaneParser` (see [[ROOM-ENGINE]]) is rendered **once** into a single `RenderTexture` sized to its on-screen footprint, and displayed as one sprite thereafter.

- `FloorRasterizer` / `WallRasterizer` (`src/nitro/room/object/visualization/room/rasterizer/basic/`) look up a `FloorPlane`/`WallPlane` visualization by material id and delegate to its own render, filling a cached `RenderTexture`.
- `LandscapeRasterizer` (`.../rasterizer/animated/`) is the animated counterpart for window/landscape backdrops, tracking a time-based interval to periodically regenerate the cached bitmap.
- `PlaneMaterialCellMatrix` is the actual tiling engine: a plane's material is modeled as a matrix of texture "cell columns", repeated across the target width according to a repeat mode (`ALL`/`BORDERS`/`CENTER`/`FIRST`/`LAST`/`RANDOM` — random tiling is what gives some floor textures an organic, non-repeating look). The result is cached and only regenerated when the plane's size or normal actually changes.

The practical implication: a static room floor costs one draw call per plane, not per tile, and stays cached across frames unless the plane's geometry changes.

## The full render chain, end to end

1. A furniture-add message arrives; `RoomInstance.createRoomObject()` places the object under the correct `RoomObjectManager` for its category ([[ROOM-ENGINE]]) and hands it to the attached renderer.
2. The object's visualization type resolves through `RoomObjectVisualizationFactory` ([[FURNITURE]]) to a concrete `Visualization` class, backed by shared, type-cached visualization data.
3. Each tick, `RoomInstance.update` → `RoomSpriteCanvas.render()` calls `visualization.update(geometry, time, ...)` for every object (gated by the animation-fps clock — [[TIMING-AND-ANIMATION]]), recomputing its current sprites/textures/tints/flips. For room-shell planes, this is where a pre-rasterized `RenderTexture` from above gets selected as the sprite's texture.
4. The object's tile-space location becomes a screen position via `RoomGeometry.getScreenPosition` (cached until it changes), and every visible sprite is wrapped in a `SortableSprite` with computed `x/y/z`.
5. All `SortableSprite`s across every object are globally depth-sorted back-to-front and synced onto pooled Pixi sprite children in that order.
6. The result sits inside `_master`, clipped by the canvas mask, and is either added into the host application's live scene graph or captured to a `RenderTexture` for a thumbnail.
7. PixiJS's own render loop draws that container tree to the canvas/WebGL surface, producing the final composited isometric frame.

## Where to go next

- [[FURNITURE]] — the visualization-type mapping and stacking model referenced in steps 1-2 above.
- [[TIMING-AND-ANIMATION]] — exactly when step 3's `visualization.update()` is allowed to run.
