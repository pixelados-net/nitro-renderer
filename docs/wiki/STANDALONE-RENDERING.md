# Standalone Rendering

The `@nitrots/nitro-renderer/standalone` entrypoint renders **avatars, furniture and rooms as images without the full client**: no websocket, no emulator, no `Nitro.bootstrap()`. It is designed for CMS integrations, web catalogs, admin tooling, and similar use cases.

The only requirement is HTTP access to the **static assets** the client already uses: configuration, figuredata/figuremap, effectmap, furnidata and the `.nitro` bundles.

## Initialization

```ts
import { createNitroImaging } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({
    // The same configuration JSON the client uses (renderer-config)
    configurationUrl: 'https://assets.myhotel.com/renderer-config.json',

    // Optional: override/add individual keys
    configuration: {
        'furnidata.url': 'https://assets.myhotel.com/gamedata/furnidata.json'
    }
});
```

Required configuration keys (all present in a standard client config): `avatar.default.figuredata`, `avatar.figuredata.url`, `avatar.actions.url`, `avatar.figuremap.url`, `avatar.effectmap.url`, `avatar.asset.url`, `furnidata.url`, `room.asset.url`, `pet.types`, plus the base asset URLs.

> **CORS**: the asset host must send `Access-Control-Allow-Origin` for the page's origin, otherwise initialization will fail while fetching configuration and asset bundles.

## Avatars

```ts
// Single avatar frame (HTMLImageElement; .src is a data URL)
const image = await imaging.avatar.render({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    gender: 'M',
    direction: 2,        // 0-7
    posture: 'std',      // 'std' | 'sit' | 'lay' | 'wlk' ...
    gesture: 'sml',      // 'sml' | 'sad' | 'agr' | 'srp' (short asset codes)
    expression: 'wave',  // 'wave' | 'blow' | 'laugh' | 'cry' | 'idle' | 'respect'
    dance: 1,            // optional; its dance.N library downloads automatically
    effect: 6,           // optional; downloads automatically
    frame: 0,            // animation frame
    headOnly: false
});

document.body.appendChild(image);

// Or the data URL directly:
const dataUrl = await imaging.avatar.renderDataUrl({ figure, headOnly: true });
```

Clothing library downloads are automatic: the method waits until every required library is ready before resolving.

> Note the naming quirk inherited from Habbo: **gestures** use short codes (`sml`, `sad`, `agr`, `srp`) while **expressions** use full action names (`wave`, `blow`, `laugh`...). The short expression codes `wav`/`blw` are also accepted as aliases.

## Furniture

```ts
// By classname (furnidata)
const throne = await imaging.furni.render({
    classname: 'throne',
    direction: 90,   // degrees (0, 90, 180, 270)
    state: 0,
    scale: 64        // 64 | 32
});

// By typeId (wall items with wallItem: true)
const poster = await imaging.furni.render({ typeId: 4054, wallItem: true });

const dataUrl = await imaging.furni.renderDataUrl({ classname: 'throne' });
```

## Rooms (declarative)

```ts
const roomImage = await imaging.room.render({
    // Habbo-style floor plan ('x' = blocked, 0-9 = tile height). Optional:
    // without a plan, a square room of `size` tiles is generated.
    floorPlan: 'xxxxxx\nx0000\nx0000\nx0000\nx0000',
    // Arcturus-compatible room decoration material identifiers:
    floorType: '501',
    wallType: '301',
    items: [
        { classname: 'throne', x: 2, y: 2, direction: 4, state: 0 },
        { classname: 'club_sofa', x: 3, y: 1, direction: 2 }
    ],
    avatars: [
        { figure: 'hd-180-1.ch-210-66.lg-270-82', x: 1, y: 3, direction: 4, posture: 'std' }
    ],
    width: 600,
    height: 400,
    scale: 64
});
```

Item and avatar directions are 0-7 (converted to degrees internally). The room is created, captured and destroyed automatically; all furniture assets are awaited before the snapshot is taken.

## Animations

```ts
import { buildSpriteSheet, encodeGif } from '@nitrots/nitro-renderer/standalone';

// Frame sequence with a stable canvas size (no jitter)
const frames = await imaging.avatar.renderAnimation({ figure, expression: 'wave' }, 8);

// Horizontal sprite sheet
const sheet = await buildSpriteSheet(frames);
document.body.appendChild(sheet.canvas); // sheet.dataUrl, sheet.frameWidth...

// Animated GIF (Blob)
const gif = await encodeGif(frames, { delayMs: 120 });
const url = URL.createObjectURL(gif);
```

## Cleanup

```ts
imaging.dispose(); // releases the renderer, managers and listeners
```

## Coexistence with the full client

If `await Nitro.bootstrap()` already completed on the same page, `createNitroImaging` **reuses** the existing Pixi `Application` instead of creating a new one. The client flow is unaffected.

## Current limitations

- Browser only (uses DOM canvas/WebGL). Server-side/Node rendering is planned.
- Wall items use a default position unless an explicit `location` is provided.
- Effects that attach sprites outside the body (hoverboards, UFOs, mounts) only render the body animation; the extra effect sprites are composited by the room visualization, not by the single-avatar image path.
