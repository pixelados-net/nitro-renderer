# Avatar Animations

This page covers what makes an avatar move: the action system, how actions layer onto the figure/geometry from [[AVATAR-RENDERING]], the animation data format, and a worked example of building a custom animation.

## The action system

`AvatarAction` (`src/api/nitro/avatar/enum/AvatarAction.ts`) defines every action type. They fall into five categories, and — this trips people up — **they don't share a naming convention**:

| Category | Values | Notes |
|---|---|---|
| Postures | `std`, `sit`, `lay`, `mv` (walk), `swim`, `float` | Drive the base body geometry/pose |
| Gestures | `sml`, `sad`, `agr`, `srp` | Short codes, facial overlays |
| Expressions | `wave`, `blow`, `laugh`, `cry`, `idle`, `respect`, `sbollie`, `sb360`, `ridejump` | **Full words**, not short codes — `AvatarAction.EXPRESSION_MAP` is the numeric↔string lookup used by the network protocol |
| Dances | Numeric `1`-`4` | Downloaded on demand, see below |
| Effects | Numeric ids | Downloaded on demand, see below |

The gesture/expression naming split is a real, protocol-inherited quirk — code that accepts a string from a user needs to know which family it's dealing with (see [[STANDALONE-RENDERING]]'s alias table for how the imaging facade papers over the short `wav`/`blw` codes some data sources use).

## Appending and resolving actions

```ts
avatarImage.appendAction(AvatarAction.POSTURE, AvatarAction.POSTURE_STAND);
avatarImage.appendAction(AvatarAction.GESTURE, 'sml');
avatarImage.appendAction(AvatarAction.DANCE, 1);
avatarImage.endActionAppends();
```

`appendAction(type, param)` queues an `ActiveActionData`. `endActionAppends()` resolves the queue: for every queued `fx`/dance action not yet downloaded, it kicks off the download (see below), sorts actions, then calls `setActionToParts()` per action. Critically:

```ts
if (action.definition.isMain) {
    this._mainAction = action;
    this._cache.setGeometryType(action.definition.geometryType);
}
```

**Only one action can be `isMain`** — normally the current posture. It alone drives `_mainAction`/the base `geometryType` (standing/sitting/lying/swimming). Every other queued action (gestures, expressions, effects, dances) layers its own body-part overrides on top without changing the base geometry — this is why you can wave while sitting, but not "sit" and "stand" simultaneously.

## Dances and effects require a download

This is the single most common gotcha when using this API outside a live room: **dance and effect animations are not part of the base avatar figure download.** They live in a separate effect map (`avatar.effectmap.url`), fetched by `EffectAssetDownloadManager` — a completely independent pipeline keyed by numeric effect id (dance ids `1`-`4` use the same map as numbered `fx` effects).

In a live room this is invisible because `AvatarVisualization.processActionsForAvatar()` — called every render pass — appends dance/effect actions and `endActionAppends()` transparently checks `effectManager.isAvatarEffectReady(id)`, downloading if needed. If you're driving `AvatarImage` directly (as [[STANDALONE-RENDERING]] does), you must await the download yourself before the dance/effect will actually render — rendering before it's ready silently produces a static, un-animated result rather than an error.

## Animation data format

`HabboAvatarAnimations.ts` (`src/nitro/avatar/data/HabboAvatarAnimations.ts`) is a static table of body-pose animations (`Default`, `Sit`, `Lay`, `Move`, `Wave`, `Talk`, `Sign`, `Respect`, `Blow`, `Laugh`). Each entry has an `id` and a `parts` array — one per figure `setType` (`bd`, `lg`, `sh`, `ch`, `lh`, ...) — and each part has its own `frames` array of `{ number, assetPartDefinition }`. Different parts of the *same* animation can have different frame counts: `Default`'s body parts each have 8 frames; `Wave`'s arm-related parts have 2 frames while its chest layer has 4. A `repeats` field on a frame holds it for multiple ticks without repeating the entry manually (`AnimationActionPart` expands `repeats` by literal duplication at parse time).

Frame resolution is a **modulo, not a clamp**, applied independently per body part (`AvatarImagePartContainer.getFrameIndex`):

```ts
public getFrameIndex(k: number): number {
    return k % this._frames.length;
}
```

`k` is `AvatarImage._frameCounter` — one ever-incrementing counter shared by the whole avatar. Because each part wraps at its *own* period, a 4-frame chest layer and a 2-frame arm layer driven by the same counter stay visually in sync without either "waiting" for the other. See [[TIMING-AND-ANIMATION]] for exactly when and how often `_frameCounter` advances during live playback.

## Worked example: building and exporting a dance animation

This example uses [[STANDALONE-RENDERING]] so it's runnable outside a live room, but the same `appendAction`/frame-stepping calls are what happens under the hood inside a room too.

```ts
import { createNitroImaging, buildSpriteSheet, encodeGif } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({
    configurationUrl: 'https://assets.myhotel.com/renderer-config.json'
});

// renderAnimation() internally:
//  1. resolves the figure and awaits its clothing libraries (AVATAR-FIGURES)
//  2. awaits the dance's effect library (EffectAssetDownloadManager, above)
//  3. calls appendAction(POSTURE, 'std') + appendAction(DANCE, 1) + endActionAppends()
//  4. loops N times: avatarImage.getImage(...) then avatarImage.updateAnimationByFrames(1)
const frames = await imaging.avatar.renderAnimation({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    posture: 'std',
    dance: 1
}, 8); // 8 exported frames

const gif = await encodeGif(frames, { delayMs: 120 });
const url = URL.createObjectURL(gif);

imaging.dispose();
```

If you were driving `AvatarImage` yourself instead of going through the facade, the equivalent manual sequence is:

```ts
avatarImage.appendAction(AvatarAction.POSTURE, 'std');
avatarImage.appendAction(AvatarAction.DANCE, 1);
avatarImage.endActionAppends(); // downloads dance.1's library if needed

const frames: RenderTexture[] = [];
for (let i = 0; i < 8; i++) {
    frames.push(avatarImage.getImage(AvatarSetType.FULL, false));
    avatarImage.updateAnimationByFrames(1); // manual step — no ticker involved
}
```

## Where to go next

- [[TIMING-AND-ANIMATION]] — the two-clock system that paces animation during live playback.
- [[STANDALONE-RENDERING]] — the full imaging API reference (avatar, furni, room, animation export).
- [[EXAMPLES]] — more end-to-end recipes, including live-room packet-driven animation.
