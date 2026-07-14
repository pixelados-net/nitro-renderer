# Room Engine

This page covers the *data model* of a room: the isometric coordinate system, how a floor plan becomes tile geometry, and how objects are organized within a room instance. How that data actually gets painted to screen is [[ROOM-RENDERING]]; how a furniture object picks its visual representation is [[FURNITURE]].

## The isometric coordinate system

`RoomGeometry` (`src/room/utils/RoomGeometry.ts`) is the camera/projection model that converts tile-space `(x, y, z)` coordinates into 2D screen pixels. It's constructed with a `scale`, a `direction` vector (yaw/pitch/roll in degrees), and a camera `location` vector — all represented as `Vector3d` (`src/api/room/Vector3d.ts`), a plain 3-component math vector reused for both tile positions and camera orientation basis vectors.

The `direction` setter builds three orthonormal basis vectors by rotating the world axes around the given angles; two become the screen X/Y projection axes, the third is the depth axis. `getScreenPosition(point)` subtracts the camera location, projects onto those axes, and multiplies by `scale` (pixels per tile) — this single method is the isometric projection formula the entire renderer relies on. `scale` itself comes in two flavors: `RoomGeometry.SCALE_ZOOMED_IN = 64` and `SCALE_ZOOMED_OUT = 32` pixels per tile.

`RoomSpriteCanvas` always constructs its geometry with the classic Habbo camera: direction `(-135, 30, 0)`, location `(11, 11, 5)` — a 135° yaw looking down at 30°. `getPlanePosition()` does the inverse operation: given a screen point (a mouse click), it intersects a ray back into tile space, which is how clicks resolve to room tiles.

## The tile map / floor plan

A floor plan arrives from the server as a string, rows separated by `\r`. Each character is parsed as base-36 (`0-9, a-z` → tile height 0-35); `x`/`X` marks a blocked/non-existent tile.

`RoomPlaneParser` (`src/nitro/room/object/RoomPlaneParser.ts`) compiles that raw height grid into actual room geometry:

- The walkable bounding box and the highest floor height.
- **Floor planes** — merged rectangular regions of equal height, extracted by a marching-rectangles-style algorithm, so a large flat floor becomes one plane instead of hundreds of individual tiles.
- **Wall planes** — traced by walking the height-grid contour, turned into 3D quads with origin/edge vectors and clipping normals.

`RoomMapData` (`src/nitro/room/object/RoomMapData.ts`) is the serializable DTO form of this (width, height, wall height, tile map, hole map) — this is what you build by hand if you're constructing a synthetic room (see [[STANDALONE-RENDERING]]'s `imaging.room.render({ floorPlan })`, or [[EXAMPLES]]).

Two more heightmap-adjacent structures exist for different purposes, and are easy to conflate:

- **`LegacyWallGeometry`** (`src/nitro/room/utils/LegacyWallGeometry.ts`) — a lightweight heightmap used for *placement math*, not rendering. `getFloorAltitude()` adds a "half-tile" bump when a tile sits next to a taller neighbor — this is what avatar movement snaps onto, not what the renderer draws.
- **`FurnitureStackingHeightMap`** — server-authoritative, per-tile stacking height (see [[FURNITURE]]) — a different concern again (what's the current top-of-stack Z), populated from a separate network event.

## `RoomInstance` and `RoomObject`

`RoomInstance` (`src/room/RoomInstance.ts`) is the per-room aggregate root. It owns:

- A map of `IRoomObjectManager`, one per `RoomObjectCategory` (below) — objects are queried/iterated per-category rather than scanned from one flat list.
- A renderer reference (`IRoomRendererBase`) — set via `setRenderer`.
- A list of "update categories" it ticks each frame.
- Room-level model variables (door position, z-scale, scaling restrictions).

`update(time)` iterates only the registered update categories, ticks each object's `logic.update(time)`, then delegates to the renderer.

`RoomObjectCategory` (`src/api/nitro/room/object/RoomObjectCategory.ts`) is the classification axis:

| Category | Value | Represents |
|---|---|---|
| `MINIMUM` | -2 | Sentinel |
| `ROOM` | 0 | The room shell itself |
| `FLOOR` | 10 | Floor-placed furniture |
| `WALL` | 20 | Wall-placed furniture |
| `UNIT` | 100 | Avatars, pets, bots |
| `CURSOR` | 200 | The tile-hover cursor |

This is an *organizational/query* axis — not directly a render z-order mechanism. Actual on-screen depth ordering is computed per-sprite in `RoomSpriteCanvas`, described next.

## Where to go next

- [[ROOM-RENDERING]] — how `RoomInstance`'s objects actually get painted, depth-sorted and masked into a display object.
- [[FURNITURE]] — how a furniture object picks its `Visualization` class and what stacking means.
