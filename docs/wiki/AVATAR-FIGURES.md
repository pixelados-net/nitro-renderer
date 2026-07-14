# Avatar Figures

This page covers the *data* side of an avatar: the figure string format, what it means, and the three separate data sources involved in validating and rendering one. The *pixel* side (turning a figure into a composited sprite) is [[AVATAR-RENDERING]]; making it move is [[AVATAR-ANIMATIONS]].

## Anatomy of a figure string

A figure looks like this:

```text
hd-180-1.ch-210-66.lg-270-82.sh-290-80
```

Each dot-separated segment is one body part: `<part-type>-<set-id>-<color-id>[-<color-id-2>...]`. Some parts carry more than one color id: e.g. `ch-3030-64-1408` is chest-type set `3030` with two colors `[64, 1408]` (a primary and secondary tone, used by two-tone clothing layers).

Common part-type codes (the definitive list always comes from a hotel's `figuredata`, but these are the standard Habbo conventions):

| Code | Part |
|---|---|
| `hd` | Head/body shape |
| `hr` | Hair |
| `ha` | Hat |
| `he` | Head accessory (glasses, etc.) |
| `ea` | Eye accessory |
| `fa` | Face accessory |
| `ch` | Chest/shirt |
| `cc` | Chest print/coat |
| `ca` | Chest accessory |
| `lg` | Legs |
| `sh` | Shoes |
| `wa` | Waist |
| `cp` | Chest print |

`AvatarFigureContainer` (`src/nitro/avatar/AvatarFigureContainer.ts`) is the in-memory model:

```ts
import { AvatarFigureContainer } from '@nitrots/nitro-renderer';

const figure = new AvatarFigureContainer('hd-180-1.ch-210-66.lg-270-82.sh-290-80');

figure.hasPartType('ch');          // true
figure.getPartSetId('ch');         // 210
figure.getPartColorIds('ch');      // [66]

figure.updatePart('ha', 1002, [61]); // add a hat
figure.removePart('ha');             // remove it again

figure.getFigureString();          // serializes back: exact inverse of the constructor
```

`updatePart` overwrites any existing entry for that type (and moves it to the end of iteration order: this is why `getFigureString()`'s output order can shift after edits, harmless for parsing but worth knowing if you're diffing strings).

## Three separate data sources

It's easy to conflate these three, but they're independent downloads with independent purposes:

1. **figuredata** is the *catalog*: every valid part set, its palette, colors, club level and gender restriction. Modeled by `FigureSetData` (`src/nitro/avatar/structure/FigureSetData.ts`), built from `Palette` and `SetType` objects. Loaded first from a bundled default, then merged with a hotel-specific download (`avatar.figuredata.url`).
2. **figuremap** (tells the client which *asset library* (which `.nitro` bundle) contains the graphics for a given `type:id`. figuredata never references file names directly) this indirection is what figuremap resolves. Handled by `AvatarAssetDownloadManager`.
3. **Asset libraries**: the actual downloaded sprite sheets, fetched on demand once a figure references a part set whose library hasn't been downloaded yet.

A figure is only fully renderable once every library its parts reference has finished downloading: `AvatarRenderManager.isFigureContainerReady(container)` checks exactly that, and `createAvatarImage()` returns a placeholder image (see [[AVATAR-RENDERING]]) until it is.

## Mandatory parts and gender validation

Some part types are mandatory per gender (you can't have a headless avatar). `SetType` tracks two mandatory flags per gender (a "normal" tier and an HC/level-2 tier. `AvatarStructure.getMandatorySetTypeIds(gender, level)` returns every type that must be present; `AvatarRenderManager.validateAvatarFigure()` uses this to patch a figure that's missing (or references a now-invalid) mandatory part, filling in the first available `clubLevel === 0` default for that type and gender. This runs automatically inside `createAvatarImage()` whenever a `gender` argument is supplied) you don't normally call it directly.

## Club level (HC) and color validation

Club level is tracked on two independent things: the part set itself (`FigurePartSet.clubLevel`) and each individual color (`PartColor.clubLevel`). `AvatarRenderManager.getFigureClubLevel(container, gender, searchParts?)` walks every part actually present in the figure, taking the maximum club level across both the part set and every selected color, then additionally checks parts *not* present in the figure for a "becomes optional from club level N" threshold. The resulting integer is the minimum club membership a figure legally requires: `0` means no HC needed.

```ts
const clubLevel = Nitro.instance.avatar.getFigureClubLevel(figure, 'M');
if (clubLevel > 0) {
    // this outfit requires HC: gate accordingly in your UI
}
```

Don't confuse this with `GraphicAssetPalette` (`src/api/asset/GraphicAssetPalette.ts`), an unrelated, lower-level concept: a raw 256-entry RGB remap table applied per-pixel to a texture to recolor it. figuredata's "palette" (`SetType.paletteID`) is a *grouping* of valid colors for a part type; `GraphicAssetPalette` is the pixel-level mechanism that actually applies one of those colors to a sprite.

## Where to go next

- [[AVATAR-RENDERING]]: how a validated `AvatarFigureContainer` becomes a composited sprite.
- [[AVATAR-ANIMATIONS]]: postures, gestures, dances and effects layered on top of a figure.
