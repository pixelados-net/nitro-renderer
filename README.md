# Nitro Renderer

nitro-renderer is a JavaScript library for rendering Nitro in the browser with PixiJS 8.

## Installation

npm

```
npm install @nitrots/nitro-renderer
```

yarn

```
yarn add @nitrots/nitro-renderer
```

## Client bootstrap

PixiJS 8 initializes its renderer asynchronously, so full clients must await the
bootstrap before reading `Nitro.instance` or starting configuration:

```ts
import { Nitro } from '@nitrots/nitro-renderer';

await Nitro.bootstrap();
Nitro.instance.core.configuration.init();
```

The standalone imaging API remains promise-based and keeps the same public
signatures. See [standalone rendering](docs/wiki/STANDALONE-RENDERING.md).
