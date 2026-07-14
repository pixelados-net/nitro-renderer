# Nitro Renderer

JavaScript/TypeScript library for rendering Nitro (Habbo rooms, furniture and avatars) in the browser using PixiJS.

> **This wiki is generated automatically** from the [`docs/wiki/`](https://github.com/pixelados-net/nitro-renderer/tree/main/docs/wiki) folder of the repository on every push to `main`. Do not edit pages here: your changes will be overwritten. Open a pull request against `docs/wiki/` instead.

## What is this?

`@nitrots/nitro-renderer` is the rendering engine used by Nitro clients (such as nitro-react). This project is a fork of [billsonnn/nitro-renderer](https://github.com/billsonnn/nitro-renderer), detached from its original fork network and maintained independently by [pixelados-net](https://github.com/pixelados-net). On top of the upstream engine, this fork adds:

- A **standalone imaging entrypoint** that renders avatars, furniture and full rooms as images without a websocket connection or an emulator, ideal for CMS integrations, catalog tooling and admin panels.
- **Avatar animation export** to sprite sheets and animated GIFs.
- Modernized tooling (TypeScript 5, Vite 7, ESLint 9, PixiJS 8) with CI, tests and opt-in memory management.

## Reading order

This wiki is written to be read start to back, not just dipped into: each page assumes the ones before it. If you're new to the codebase, follow this thread:

1. **[[INSTALLATION]]**: get the library building.
2. **[[ARCHITECTURE]]**: the map, covering source layout, the manager table and the full-client lifecycle at a glance.
3. **[[NITRO-CORE]]**: the `Nitro` singleton, `bootstrap()`, the `Disposable`/`NitroManager` base pattern every manager shares, configuration, and the event system.
4. **[[NETWORKING]]** → **[[PACKET-PROTOCOL]]**: how bytes get on and off the wire, from the connection lifecycle down to the exact EvaWire binary framing and the composer/parser/event pattern, ending with a step-by-step guide to adding a new packet handler.
5. **[[TIMING-AND-ANIMATION]]**: the two clocks (render fps vs. animation fps) that pace every moving thing in the engine. Read this before the avatar/room pages below; they both assume it.
6. **[[AVATAR-FIGURES]]** → **[[AVATAR-RENDERING]]** → **[[AVATAR-ANIMATIONS]]**: an avatar from the outside in, covering what a figure string means, how it's composited into pixels, and how postures/gestures/dances/effects make it move (with a full worked animation example).
7. **[[ROOM-ENGINE]]** → **[[ROOM-RENDERING]]** → **[[FURNITURE]]**: a room from the outside in, covering the isometric coordinate system and tile map, how objects get depth-sorted and painted, and how furniture picks its visual behavior.
8. **[[STANDALONE-RENDERING]]**: everything above, usable without a server connection at all via the `/standalone` entrypoint used for CMS/catalog integrations.
9. **[[EXAMPLES]]**: a cookbook running the whole thread end to end, from a single figure string up to bootstrapping a full connected client.

## Pages by category

| Category | Pages |
|---|---|
| Getting Started | [[Home]] · [[INSTALLATION]] |
| Core Architecture | [[ARCHITECTURE]] · [[NITRO-CORE]] |
| Networking | [[NETWORKING]] · [[PACKET-PROTOCOL]] |
| Timing | [[TIMING-AND-ANIMATION]] |
| Avatars | [[AVATAR-FIGURES]] · [[AVATAR-RENDERING]] · [[AVATAR-ANIMATIONS]] |
| Rooms | [[ROOM-ENGINE]] · [[ROOM-RENDERING]] · [[FURNITURE]] |
| Standalone Imaging | [[STANDALONE-RENDERING]] |
| Guides | [[EXAMPLES]] |

## Links

- [Repository](https://github.com/pixelados-net/nitro-renderer)
- [Issues](https://github.com/pixelados-net/nitro-renderer/issues)
