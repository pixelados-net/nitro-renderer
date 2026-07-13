# Architecture

## Source layout

```
src/
├── core/         Configuration, networking (websocket + packet codecs), base utilities
├── api/          Public interfaces + AssetManager (loads .nitro asset bundles)
├── events/       All event classes (NitroEvent and derivatives)
├── room/         Generic room engine: sprite canvas, isometric geometry, room instances
├── nitro/        The "client" layer: Nitro, RoomEngine, AvatarRenderManager, session, sound...
├── pixi-proxy/   Thin wrappers over PixiJS (Application, TextureUtils, Ticker helpers)
└── standalone/   Connection-less imaging facade (see STANDALONE-RENDERING)
```

## Full-client lifecycle

1. `Nitro.bootstrap()` creates the canvas, the Pixi `Application` and the `Nitro.instance` singleton.
2. Configuration loads (`NitroConfiguration`) and fires `ConfigurationEvent.LOADED`.
3. The websocket connection is established (`communication`) — **required by `Nitro.init()`**.
4. `Nitro.init()` initializes the managers in order: avatar → sound → session → `RoomEngine`.
5. `RoomEngine` fires `RoomEngineEvent.ENGINE_INITIALIZED` once the `RoomContentLoader` is ready.

## Managers

| Manager | Responsibility | Needs a connection? |
|---|---|---|
| `NitroCommunicationManager` | Websocket, EvaWire codec, incoming/outgoing messages | Yes |
| `AvatarRenderManager` | Avatar figures: geometry, part sets, animations, clothing downloads | **No** |
| `RoomEngine` | Room instances, objects, visualizations, furni/pet imaging | Only for live rooms |
| `RoomManager` | Lifecycle of `RoomInstance` and its objects | No |
| `SessionDataManager` | Session data (user, permissions, badges, furnidata) | Yes |
| `RoomSessionManager` | Room sessions (enter/leave, users) | Yes |
| `RoomCameraWidgetManager` | In-room camera/photo | No |
| `SoundManager` | Music and effects (howler) | Partially |

## Asset pipeline

Assets are downloaded over HTTP as `.nitro` bundles (zlib-compressed archive containing a spritesheet JSON plus a PNG). `AssetManager` (via `GetAssetManager()`) keeps every collection in memory; downloads run in parallel (8 concurrent connections).

### Memory management

By default the asset cache grows unbounded (historical behavior). For long sessions or batch imaging you can enable LRU eviction:

```ts
GetAssetManager().setCollectionEvictionLimit(200); // keep at most 200 collections
```

Mandatory room libraries (`room`, `tile_cursor`, `selection_arrow`, placeholders) are never evicted; you can protect additional names with the second argument.

## Singletons worth knowing

- `Nitro.instance` — the full client (null when using only the standalone facade).
- `PixiApplicationProxy.instance` — the Pixi `Application` (renderer + ticker). `TextureUtils` uses it by default to generate textures; it can be overridden with `TextureUtils.setRenderer(...)`.
- `AssetManager._INSTANCE` via `GetAssetManager()` — the global collection/texture cache.

## Event system

`EventDispatcher` implements snapshot semantics: listeners added during a dispatch are not invoked for the in-flight event, and listeners removed during a dispatch still receive it. Dispatch is zero-copy (copy-on-write only happens when listeners mutate mid-dispatch).
