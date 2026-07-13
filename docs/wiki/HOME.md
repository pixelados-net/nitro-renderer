# Nitro Renderer

JavaScript/TypeScript library for rendering Nitro (Habbo rooms, furniture and avatars) in the browser using PixiJS.

> **This wiki is generated automatically** from the [`docs/wiki/`](https://github.com/pixelados-net/nitro-renderer/tree/main/docs/wiki) folder of the repository on every push to `main`. Do not edit pages here — your changes will be overwritten. Open a pull request against `docs/wiki/` instead.

## Pages

| Page | Description |
|---|---|
| [[INSTALLATION]] | How to install, build and develop the library |
| [[ARCHITECTURE]] | Managers, lifecycle, asset pipeline and how the pieces fit together |
| [[STANDALONE-RENDERING]] | Rendering avatars, furniture and rooms **without** the full client (`/standalone` entrypoint) |

## What is this?

`@nitrots/nitro-renderer` is the rendering engine used by Nitro clients (such as nitro-react). This fork adds, on top of the upstream engine:

- A **standalone imaging entrypoint** that renders avatars, furniture and full rooms as images without a websocket connection or an emulator — ideal for CMS integrations, catalog tooling and admin panels.
- **Avatar animation export** to sprite sheets and animated GIFs.
- Modernized tooling (TypeScript 5, Vite 7, ESLint 9, PixiJS 7) with CI, tests and opt-in memory management.

## Links

- [Repository](https://github.com/pixelados-net/nitro-renderer)
- [Issues](https://github.com/pixelados-net/nitro-renderer/issues)
