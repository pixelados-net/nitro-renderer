# Avatar Rendering

[[AVATAR-FIGURES]] covers what a figure *means*; this page covers how it becomes pixels. [[AVATAR-ANIMATIONS]] covers what makes it move.

## From figure to layers

`AvatarStructure.getParts()` is the real figure→layers resolver. For every part-type entry in an `AvatarFigureContainer`, it looks up the matching `SetType`/`Palette`/`FigurePartSet` from figuredata, resolves the actual color from the figure's color ids, and for every drawable graphic inside that set constructs an **`AvatarImagePartContainer`** — one object per drawable layer, carrying its part type, part id, resolved color (RGB + club level), animation frame list, and colorability flags. This is a *definition* object, not yet a rendered sprite.

**`AvatarImageBodyPartContainer`** is a different, higher-level object: it wraps the final composited PixiJS `Container` for one body-part *slot* (e.g. "head"), plus its registration offset and an `isCacheable` flag. Many `AvatarImagePartContainer` layers can compose into one `AvatarImageBodyPartContainer`.

`AvatarImage.getBodyParts(setType, geometryType, direction)` determines which body-part slots are even visible for a given `setType` (`FULL`/`HEAD`/`BODY`) and direction — it converts the 0-7 direction into degrees and asks the geometry model which slots face the camera.

## Three output methods, three use cases

| Method | Returns | Use case |
|---|---|---|
| `getImage(setType, highlight, scale, cache)` | `RenderTexture` | The live, ticker-driven avatar in a room — reuses a persistent GPU render target across calls |
| `getImageAsSprite(setType, scale)` | `NitroSprite` | A one-off snapshot needing its own disposable texture (e.g. a UI thumbnail) |
| `getCroppedImage(setType, scale)` | `HTMLImageElement` | Exporting outside PixiJS entirely — `<img>` tags, downloads |

All three run the same compositing loop internally; they differ only in what container/output type wraps the result. [[STANDALONE-RENDERING]]'s `imaging.avatar.render()` is a thin promise-based wrapper around `getCroppedImage`.

## The caching hierarchy

Compositing an avatar from scratch every frame would be wasteful for a static pose. `AvatarImageCache` (`src/nitro/avatar/cache/AvatarImageCache.ts`) caches along a hierarchy: **body part → action → direction → frame**. `getImageContainer()` walks this chain and only does the expensive work — resolving textures by an `assetPartDefinition_partType_partId_direction_frame` naming convention (with fallback tiers), applying the part's RGB tint, and flattening everything into one union container — when nothing is cached for that exact `(part, action, direction, frame)` tuple.

`disposeInactiveActions()` periodically evicts action-level caches that haven't been touched in `DEFAULT_MAX_CACHE_STORAGE_TIME_MS` (60 seconds by default), so a figure that stops performing an action (say, walking) doesn't hold onto walk-cycle textures forever.

## Direction and geometry

Avatars use 8 isometric directions (0-7, 45° increments), defined by `AvatarDirectionAngle.DIRECTION_TO_ANGLE`. Asset libraries typically only ship front/left-facing artwork; directions 4-6 (`DIRECTION_IS_FLIPPED`) are rendered as horizontally mirrored copies of directions 1-3 rather than separately drawn, saving asset size.

`AvatarImage.setDirection(setType, direction)` normalizes the value into `[0,7]`. Body direction (`_mainDirection`) and head direction (`_headDirection`) are tracked **independently** — this is what lets a walking avatar's head look toward the camera while its body walks a different direction — unless the current action explicitly prevents head-turning, in which case the head is forced to match the body.

```ts
import { AvatarSetType } from '@nitrots/nitro-renderer';

avatarImage.setDirection(AvatarSetType.FULL, 4); // body faces direction 4
avatarImage.setDirection(AvatarSetType.HEAD, 2); // head looks toward direction 2
```

## Where to go next

- [[AVATAR-ANIMATIONS]] — the action system that drives which pose/frames this pipeline renders.
- [[TIMING-AND-ANIMATION]] — exactly when, during live room rendering, a new frame gets composited.
