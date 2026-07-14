# Examples

A cookbook of end-to-end recipes, roughly in order of increasing scope — from a single figure string to a full connected client. Each example links back to the deep-dive page that explains *why* it works.

## 1. Parse and edit a figure string

See [[AVATAR-FIGURES]] for the full format reference.

```ts
import { AvatarFigureContainer } from '@nitrots/nitro-renderer';

const figure = new AvatarFigureContainer('hd-180-1.ch-210-66.lg-270-82.sh-290-80');

figure.updatePart('ha', 1002, [61]); // add a hat: type 'ha', set 1002, color 61
figure.removePart('ha');             // take it back off

console.log(figure.getFigureString());
```

## 2. Render a single avatar frame (no client, no connection)

See [[STANDALONE-RENDERING]] and [[AVATAR-RENDERING]].

```ts
import { createNitroImaging } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({
    configurationUrl: 'https://assets.myhotel.com/renderer-config.json'
});

const image = await imaging.avatar.render({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    gender: 'M',
    direction: 2,
    posture: 'std'
});

document.body.appendChild(image);
imaging.dispose();
```

## 3. Build and export a custom animation

See [[AVATAR-ANIMATIONS]] for the full walkthrough of why dances/effects need a download step first, and [[TIMING-AND-ANIMATION]] for how frame stepping works. This variant uses an expression instead of a dance:

```ts
import { createNitroImaging, buildSpriteSheet, encodeGif } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({ configurationUrl: '...' });

const frames = await imaging.avatar.renderAnimation({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    posture: 'std',
    expression: 'wave' // full word, not the short 'wav' code — see AVATAR-ANIMATIONS
}, 8);

const sheet = await buildSpriteSheet(frames); // sheet.canvas, sheet.dataUrl
const gif = await encodeGif(frames, { delayMs: 120 });

document.body.appendChild(sheet.canvas);
document.body.appendChild(Object.assign(new Image(), { src: URL.createObjectURL(gif) }));

imaging.dispose();
```

## 4. Render a declarative room

See [[ROOM-ENGINE]] for the floor plan format and [[ROOM-RENDERING]] for how the snapshot is captured.

```ts
import { createNitroImaging } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({ configurationUrl: '...' });

const roomImage = await imaging.room.render({
    floorPlan: 'xxxxxx\nx0000\nx0000\nx0000\nx0000', // 'x' = blocked, digits = tile height
    items: [
        { classname: 'throne', x: 2, y: 2, direction: 4, state: 0 }
    ],
    avatars: [
        { figure: 'hd-180-1.ch-210-66.lg-270-82', x: 1, y: 3, direction: 4, posture: 'std' }
    ],
    width: 600,
    height: 400
});

document.body.appendChild(roomImage);
imaging.dispose();
```

## 5. Listen for an incoming packet in a live client

See [[NETWORKING]] and [[PACKET-PROTOCOL]] for the full pipeline this relies on.

```ts
import { Nitro, RoomReadyMessageEvent } from '@nitrots/nitro-renderer';

Nitro.instance.communication.registerMessageEvent(
    new RoomReadyMessageEvent(event => {
        const parser = event.getParser();
        console.log('entered room', parser); // parser exposes the packet's typed fields
    })
);
```

Adding support for a packet type this library doesn't already model is a five-step process (header constant → parser → event → registration → listener) — see the "Adding a new incoming packet handler" section of [[PACKET-PROTOCOL]] for the full walkthrough.

## 6. Bootstrap a full connected client

This is the capstone — it ties together [[NITRO-CORE]] (the singleton and its managers), [[NETWORKING]] (the connection), and everything above (once connected, a `RoomEngine` is live and behaves exactly like the standalone examples' room/avatar rendering, just driven by the server instead of by you).

```ts
import { Nitro, ConfigurationEvent, NitroConfiguration, RoomEngineEvent } from '@nitrots/nitro-renderer';

// 1. Load configuration (config.urls) before anything else can init — see NITRO-CORE
await Nitro.bootstrap();

// 2. Kick off the connection — see NETWORKING
Nitro.instance.communication.init(); // opens the websocket to `socket.url`

// 3. Once configuration is loaded and the connection exists, init the rest of the graph
Nitro.instance.core.configuration.events.addEventListener(ConfigurationEvent.LOADED, () => {
    Nitro.instance.init(); // throws if no connection yet — see NITRO-CORE
});

// 4. React once the room engine is ready (fires once its content loader finishes)
Nitro.instance.roomEngine.events.addEventListener(RoomEngineEvent.ENGINE_INITIALIZED, () => {
    console.log('room engine ready — server-driven avatars/rooms will now render normally');
});
```

From here, every packet the server sends flows through [[PACKET-PROTOCOL]], every avatar the server places renders through [[AVATAR-RENDERING]] and animates through [[AVATAR-ANIMATIONS]] and [[TIMING-AND-ANIMATION]], and every room the server describes renders through [[ROOM-ENGINE]], [[ROOM-RENDERING]] and [[FURNITURE]] — the same pipelines the standalone examples above exercise manually, just wired to the network instead of to your own function calls.
