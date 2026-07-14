# Furniture

This page covers how a furniture object picks its visual behavior and how furniture placement/stacking works. It assumes [[ROOM-ENGINE]] (the data model) and feeds into [[ROOM-RENDERING]] (the render chain).

## From type string to `Visualization` class

`RoomObjectVisualizationFactory.getVisualizationType(type)` (`src/nitro/room/object/RoomObjectVisualizationFactory.ts`) is a large switch over `RoomObjectVisualizationType` string constants (declared on the furniture's asset data) that returns the concrete visualization class to instantiate. A few representative mappings give a sense of the range:

| Type | Class | Represents |
|---|---|---|
| `FURNITURE_ANIMATED` | `FurnitureAnimatedVisualization` | State-driven sprite-sheet animation (e.g. a lamp with on/off frames) |
| `FURNITURE_STICKIE` | `FurnitureStickieVisualization` | Editable post-it note with color/text state |
| `FURNITURE_MANNEQUIN` | `FurnitureMannequinVisualization` | Renders an avatar figure on the furniture (clothing racks) |
| `FURNITURE_EXTERNAL_IMAGE` | `FurnitureExternalImageVisualization` | Loads and displays an arbitrary external image URL (group badges/frames) |
| `FURNITURE_FIREWORKS` / `FURNITURE_GIFT_WRAPPED_FIREWORKS` | particle/timed effect classes | Timed particle effects |
| `USER` / `BOT` / `RENTABLE_BOT` | `AvatarVisualization` | The shared avatar rendering path from [[AVATAR-RENDERING]]: avatars and bots are room objects too |

`getVisualizationData(type)` maps the same type string to shared, **type-cached** `IObjectVisualizationData`: the parsed layer/animation/state definitions for that furniture type, built once and reused across every instance of that furniture in a room (or across rooms).

## Furniture animation

`FurnitureAnimatedVisualization` maintains a per-layer `AnimationStateData` with its own `frameCounter`, incremented by a `frameIncrease` amount (default `1`) on every qualifying update. Each layer's individual `AnimationFrame` carries a `remainingFrameRepeats` countdown before the layer advances to its next frame (a data-driven, per-layer repeat/sequence system distinct from the avatar's simpler global-counter-plus-modulo approach (see [[AVATAR-ANIMATIONS]]). Furniture has no secondary halving throttle the way avatars do) see [[TIMING-AND-ANIMATION]] for the exact comparison.

## Stacking

`IFurnitureStackingHeightMap` (`src/api/nitro/room/utils/IFurnitureStackingHeightMap.ts`) tracks, per tile, the current top-of-stack Z a new object would land on if placed there, whether stacking is blocked on that tile, and validates whether a furniture footprint of a given size/rotation can legally be placed there. It's populated server-side and pushed to the client via a heightmap event, then stored per room instance and retrieved via `RoomEngine.getFurnitureStackingHeightMap(roomId)`.

This is the mechanism behind placing a plant on top of a table: the height map's tile value already reflects the table's top surface, so the next placement (or an avatar walking onto that tile) snaps to the correct Z automatically (`RoomEngine.fixedUserLocation` uses exactly this to snap avatar movement onto stacked surfaces).

## Where to go next

- [[ROOM-RENDERING]]: how a furniture object's sprites, once computed, get depth-sorted and painted.
- [[TIMING-AND-ANIMATION]]: the fps gate shared by furniture and avatar animation, and where they differ.
