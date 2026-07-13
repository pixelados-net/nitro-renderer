# Installation

## As a dependency

```bash
npm install @nitrots/nitro-renderer
# or
yarn add @nitrots/nitro-renderer
```

The package ships the **TypeScript source** (`main: "./index"`); the consuming project's bundler (Vite, webpack, ...) compiles it together with the rest of the application. This is the same consumption model used by nitro-react.

Two entrypoints are available:

| Entrypoint | Contents |
|---|---|
| `@nitrots/nitro-renderer` | The full engine (client usage: `Nitro.bootstrap()`, managers, networking) |
| `@nitrots/nitro-renderer/standalone` | Connection-less imaging facade — see [[STANDALONE-RENDERING]] |

## Requirements

- Node 20+ for development.
- A bundler that resolves TypeScript sources from `node_modules` (Vite does this out of the box).
- PixiJS 7 peer environment (the library declares its own `@pixi/*` 7.4 dependencies).

## Local development

```bash
git clone https://github.com/pixelados-net/nitro-renderer.git
cd nitro-renderer
yarn install
```

Available scripts:

| Script | Description |
|---|---|
| `yarn build` | Builds the library with Vite (output in `dist/`, with sourcemaps) |
| `yarn typecheck` | Type-checks without emitting |
| `yarn compile` | Compiles with `tsc`, emitting to `dist/` |
| `yarn lint` | ESLint in check mode (used by CI) |
| `yarn eslint` | ESLint with autofix |
| `yarn test` | Runs the vitest suite |

## Linking against a local client

```bash
cd nitro-renderer
yarn link

cd ../my-client
yarn link @nitrots/nitro-renderer
```

## Continuous integration

Every push and pull request runs typecheck, lint, tests and build (`.github/workflows/ci.yml`). Publishing to npm happens automatically when a GitHub release is published (`.github/workflows/publish.yml`, requires the `NPM_TOKEN` secret).
