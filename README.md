# Nitro Renderer

[![CI](https://github.com/pixelados-net/nitro-renderer/actions/workflows/ci.yml/badge.svg)](https://github.com/pixelados-net/nitro-renderer/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40nitrots%2Fnitro-renderer.svg)](https://www.npmjs.com/package/@nitrots/nitro-renderer)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)
[![PixiJS](https://img.shields.io/badge/pixijs-8.x-e91e63.svg)](https://pixijs.com/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

A TypeScript rendering engine for Nitro-based virtual world clients (Habbo-style rooms, furniture and avatars) built on PixiJS. It powers full connected clients (such as nitro-react) and also ships a connection-less standalone imaging API for rendering avatars, furniture and rooms as plain images, useful for CMS integrations, catalog tooling and admin panels.

This project is a fork of [billsonnn/nitro-renderer](https://github.com/billsonnn/nitro-renderer), detached from its original fork network and maintained independently by [pixelados-net](https://github.com/pixelados-net). It has been substantially modernized: PixiJS 6 to 8, TypeScript 5, Vite 7, ESLint 9 flat config, a CI pipeline with tests, opt-in memory management, and a new standalone imaging entrypoint that did not exist upstream.

## Getting started

```bash
npm install @nitrots/nitro-renderer
# or
yarn add @nitrots/nitro-renderer
```

The package ships TypeScript source; your bundler compiles it alongside the rest of your application.

### Full client

PixiJS 8 initializes its renderer asynchronously, so bootstrapping a full client is an `await`:

```ts
import { Nitro } from '@nitrots/nitro-renderer';

await Nitro.bootstrap();
Nitro.instance.communication.init();
```

### Standalone imaging (no server connection needed)

```ts
import { createNitroImaging } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({
    configurationUrl: 'https://assets.myhotel.com/renderer-config.json'
});

const image = await imaging.avatar.render({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    direction: 2,
    posture: 'std'
});

document.body.appendChild(image);
imaging.dispose();
```

## Documentation

The [project wiki](https://github.com/pixelados-net/nitro-renderer/wiki) is the primary source of documentation and is written to be read start to back: from the core architecture and networking layer, through the timing system, avatars and rooms, up to the standalone imaging API and a full example cookbook. Start at the [Home](https://github.com/pixelados-net/nitro-renderer/wiki) page's reading order if you're new to the codebase.

## Development

```bash
git clone https://github.com/pixelados-net/nitro-renderer.git
cd nitro-renderer
yarn install
```

| Script | Description |
|---|---|
| `yarn build` | Builds the library with Vite (output in `dist/`, with sourcemaps) |
| `yarn typecheck` | Type-checks without emitting |
| `yarn lint` | ESLint in check mode (used by CI) |
| `yarn test` | Runs the vitest suite |

Every push and pull request runs typecheck, lint, tests and a build. See [INSTALLATION](docs/wiki/INSTALLATION.md) in the wiki for the full guide, including linking against a local client.

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).
