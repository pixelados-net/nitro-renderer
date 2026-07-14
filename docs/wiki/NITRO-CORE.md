# Nitro Core

This page explains the "Nitro system" itself: the singleton that owns every manager, how it boots up, and the two small base patterns (`Disposable` / `NitroManager` and `EventDispatcher`) that almost every class in this codebase builds on. Read this before the networking, avatar or room pages: they all assume this skeleton.

## The `Nitro` singleton

`Nitro` (`src/nitro/Nitro.ts`) is the root object of a running client. It is not meant to be constructed directly: you call the static bootstrap sequence, which builds the PixiJS application, wires up every manager, and publishes the result as `Nitro.instance`:

```ts
import { Nitro } from '@nitrots/nitro-renderer';

await Nitro.bootstrap();

Nitro.instance.init(); // requires a live connection, see NETWORKING
```

`bootstrap()` (`Nitro.ts:78`) is `async` because PixiJS 8 initializes its renderer asynchronously:

1. If a previous `Nitro.instance` exists, it is disposed and cleared first (so calling `bootstrap()` twice safely tears down the old client).
2. A `<canvas>` element is created and handed to `PixiApplicationProxy.create({...})` (`src/pixi-proxy/PixiApplicationProxy.ts`), which `await`s Pixi's `Application.init(...)` and only then registers itself as `PixiApplicationProxy.instance`.
3. `new Nitro(new NitroCore(), application)` runs the constructor, which builds every manager (see below) and wires two listeners: configuration-loaded and room-engine-ready.
4. A `webglcontextlost` listener is attached to the canvas, forwarding into `Nitro.WEBGL_CONTEXT_LOST` on the instance's own event bus.

The constructor (`Nitro.ts:49`) is where the manager graph is actually assembled: this list **is** the map of "what a full client has":

| Manager | Field | Needs a connection? |
|---|---|---|
| `NitroCommunicationManager` | `communication` | n/a (it *is* the connection layer) |
| `NitroLocalizationManager` | `localization` | Uses communication for locale packets |
| `AvatarRenderManager` | `avatar` | No |
| `RoomEngine` | `roomEngine` | Only once a room session starts |
| `SessionDataManager` | `sessionDataManager` | Yes |
| `RoomSessionManager` | `roomSessionManager` | Yes |
| `RoomManager` | `roomManager` | No |
| `RoomCameraWidgetManager` | `cameraManager` | No |
| `SoundManager` | `soundManager` | Partially (howler-driven) |

`Nitro.init()` (`Nitro.ts:104`) is the second, separate step: it initializes the managers that need an active order (avatar → sound → session/room-session → room engine), then asserts `this._communication.connection` exists and throws `'No connection found'` if not. This is why the [[STANDALONE-RENDERING]] entrypoint never calls `Nitro.init()`: it builds its own connection-less subset of these managers instead.

Disposal (`Nitro.ts:134`) walks the same graph in reverse, clearing the heartbeat interval, detaching listeners, disposing every manager, destroying the PixiJS application, and finally nulling `Nitro.INSTANCE` so nothing keeps the old graph alive.

## `NitroCore`: configuration and communication roots

`NitroCore` (`src/core/NitroCore.ts`) is a small, deliberately dumb object created once per `bootstrap()` call, holding exactly two things:

- `configuration: IConfigurationManager`: a `ConfigurationManager` instance (see below).
- `communication: ICommunicationManager`: a low-level `CommunicationManager` instance (the engine-agnostic connection pool described in [[NETWORKING]]).

`Nitro` wraps `core.communication` in a `NitroCommunicationManager` (the Nitro-flavored façade with `registerMessageEvent`, message class registration, etc.): `NitroCore` itself has no opinion about game-specific message types.

## The manager pattern: `Disposable` → `NitroManager`

Nearly every long-lived object in this codebase (managers, but also things like `RoomEngine`, `AvatarRenderManager`, `SoundManager`) extends `NitroManager` (`src/core/common/NitroManager.ts`), which itself extends `Disposable` (`src/core/common/Disposable.ts`). The contract is small and consistent everywhere:

```ts
class Disposable {
    dispose(): void;          // idempotent: no-ops if already disposed/disposing
    protected onDispose(): void; // override this, not dispose()
    disposed: boolean;
    isDisposing: boolean;
}

class NitroManager extends Disposable {
    init(): void;              // idempotent: no-ops if already loaded/loading
    protected onInit(): void;  // override this, not init()
    reload(): void;            // dispose() then init()
    events: IEventDispatcher;  // every manager gets its own event bus for free
    isLoaded: boolean;
    isLoading: boolean;
}
```

The reason to know this pattern: whenever you read `RoomEngine.onInit()` or `AvatarRenderManager.onDispose()` in the source, you're looking at the *real* setup/teardown logic: `init()`/`dispose()` are just idempotency guards around them. If you ever subclass a manager, override `onInit`/`onDispose`, never `init`/`dispose` directly.

## Configuration

Configuration is split across two collaborating pieces:

- **`NitroConfiguration`** (`src/api/configuration/NitroConfiguration.ts`) is a static, global key-value store (`Map<string, unknown>`). Every part of the engine reads settings through `NitroConfiguration.getValue<T>(key, defaultValue)`: this is what `system.fps.max`, `avatar.figuredata.url`, `room.landscapes.enabled` and every other config key resolve through. `getValue` warns once (not repeatedly) about missing keys and falls back to the provided default.
- **`ConfigurationManager`** (`src/core/configuration/ConfigurationManager.ts`) is the loader: on `onInit()` it seeds `NitroConfiguration` with hardcoded defaults, then walks `config.urls` (a list of JSON config URLs) sequentially, fetching and merging each one via `NitroConfiguration.parseConfiguration(data, overrides)`. Once every URL has loaded, it fires `ConfigurationEvent.LOADED`: this is the event `Nitro`'s constructor listens for to apply FPS/logging/landscape settings (`Nitro.ts:211`).

Configuration values support `${other.key}` interpolation (`NitroConfiguration.interpolate`), so a hotel's config JSON can define a base asset URL once and reference it from multiple derived keys (`avatar.asset.url`, `room.asset.url`, etc.).

## The event system

Every manager, and many smaller classes, communicate through `EventDispatcher` (`src/core/common/EventDispatcher.ts`) and `NitroEvent` (`src/events/core/NitroEvent.ts`) rather than direct callbacks. The contract:

```ts
dispatcher.addEventListener('SOME_EVENT_TYPE', callback);
dispatcher.removeEventListener('SOME_EVENT_TYPE', callback);
dispatcher.dispatchEvent(new NitroEvent('SOME_EVENT_TYPE'));
```

Two behaviors are worth knowing precisely because they affect correctness in edge cases:

- **Snapshot semantics.** If a listener adds or removes another listener for the *same* event type while a dispatch for that type is in progress, the change does not affect the event currently being dispatched: it only takes effect on the next `dispatchEvent` call. This is implemented with a `_dispatching` counter and copy-on-write on the listener array, not by copying the array on every single dispatch (that used to be the case; it was optimized away since network-packet-driven dispatches happen constantly).
- **A throwing listener stops the batch.** If one listener throws, `EventDispatcher` logs it and returns: listeners registered after the failing one for that dispatch do not run. This is historical behavior, not a bug fix opportunity; code that must be independent of sibling listener failures should catch its own errors.

Most domain events are subclasses of `NitroEvent` that carry extra payload fields (e.g. `RoomEngineEvent`, `AvatarRenderEvent`, `ConfigurationEvent`): the `type` string is what listeners filter on, exactly like a DOM `CustomEvent`.

## Link events

`Nitro` also exposes a tiny pub/sub for legacy "link" URLs (`addLinkEventTracker`/`removeLinkEventTracker`/`createLinkEvent`, `Nitro.ts:249-284`): trackers register a URL prefix they care about (`eventUrlPrefix`), and `createLinkEvent(link)` forwards the link to every tracker whose prefix matches (or every tracker with an empty prefix, i.e. a catch-all). This is how UI code intercepts `event:` / `nitro://`-style links embedded in chat or catalog content without the renderer needing to know what any specific link means.

## Where to go next

- [[NETWORKING]] and [[PACKET-PROTOCOL]]: how `NitroCommunicationManager` actually gets bytes on and off the wire.
- [[TIMING-AND-ANIMATION]]: the ticker that drives `RoomEngine.update()` and everything downstream.
- [[STANDALONE-RENDERING]]: what a *partial* Nitro graph looks like when there's no connection at all.
