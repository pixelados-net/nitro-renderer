# Timing and Animation

Everything that moves on screen (a room re-rendering, an avatar's walk cycle, a furniture lamp flickering) is driven by one shared PixiJS ticker, but **not** everything advances at the same rate. This page explains the two clocks involved and exactly where each kind of object hooks into them. [[AVATAR-ANIMATIONS]] and [[FURNITURE]] both assume this page.

## Two clocks, not one

| Config key | Default | Controls | Read by |
|---|---|---|---|
| `system.fps.max` | 24 | How often the shared PixiJS ticker fires at all (render rate) | `GetTicker().maxFPS`, set in `Nitro.ts` on `ConfigurationEvent.LOADED` |
| `system.fps.animation` | 24 | The *logical* rate at which sprite/animation frames are allowed to advance | `RoomSpriteCanvas._animationFPS` |

These are independent on purpose. `RoomSpriteCanvas` can be told to render at one cadence while gating "did the animation frame actually change" at another: in practice both default to 24, but a hotel config (or the [[STANDALONE-RENDERING]] facade) can tune them separately.

Three small helpers expose the shared ticker without leaking PixiJS types everywhere: `GetTicker()` (`src/pixi-proxy/GetTicker.ts`), `GetTickerFPS()` (live measured FPS), and `GetTickerTime()` (the ticker's internal clock in ms, used as the canonical "now" passed through the whole update chain instead of Pixi's per-tick `deltaTime`).

## Layer 1: `RoomEngine.update`, unthrottled every tick

`RoomEngine` registers `GetTicker().add(this.update, this)` once during init. `update(time)` runs on **every** ticker tick (up to `maxFPS` times/second), no gating at all. It processes pending furniture creation, then delegates to `RoomManager.update` → every `RoomInstance.update`.

`RoomInstance.update` does two unthrottled things every single tick:

1. **Logic update**: `object.logic.update(time)` for every object. This is where *state* advances: walking paths, timers, action state machines. Nothing here is FPS-gated.
2. **Renderer update**: delegates to `RoomRenderer.update` → every `RoomSpriteCanvas.render(time, update)`. This is where the second clock kicks in.

The takeaway: an object's logical state (where it's walking to, what action it's in) is always current. **Visual animation-frame stepping is the part that gets throttled**, one level down.

## Layer 2: `RoomSpriteCanvas.render` and the animation-fps gate

Inside `render()`, PixiJS's `deltaTime` (accumulated in `_totalTimeRunning`) is converted into a logical animation-frame index at `animationFPS`, independent of how fast the ticker is actually running:

```ts
this._totalTimeRunning += GetTicker().deltaTime;
const frame = Math.round(this._totalTimeRunning / (60 / this._animationFPS));

let updateVisuals = false;
if (frame !== this._lastFrame) {
    this._lastFrame = frame;
    updateVisuals = true;
}
```

`updateVisuals` is threaded into every object's render call:

```ts
if (updateVisuals) visualization.update(this._geometry, time, ...);
```

`IRoomObjectSpriteVisualization.update()` (implemented by both `AvatarVisualization` and `FurnitureVisualization`) is the **single choke point** where the `animationFPS` gate applies to both avatars and furniture. On render passes where the animation-frame index hasn't changed, this method simply isn't called; the object's sprites stay exactly as they were.

## Avatars get a second, independent throttle

`AvatarVisualization.update()` (only reached when layer 2 lets it through) applies its own gating on top:

- `UPDATE_TIME_INCREASER = 41ms` is a hard wall-clock floor: the method returns immediately if less than 41ms have passed since its last real update, regardless of how often it's invoked.
- `ANIMATION_FRAME_UPDATE_INTERVAL = 2`: a countdown that only calls `avatarImage.updateAnimationByFrames(1)` (the thing that actually advances `AvatarImage._frameCounter`) roughly every *other* qualifying invocation.

Net effect at default settings: `AvatarVisualization.update()` runs ~24 times/second, but the avatar's visible animation frame only advances roughly **12 times/second**: half the room's animation-fps. This is why avatar walk/dance cycles read as slightly slower cadence than, say, an animated lamp.

## Furniture: no secondary throttle

`FurnitureVisualization.update()` shares the exact same layer-2 gate as avatars (no separate ticker), but has **no** halving behavior: `updateAnimation()` runs on every invocation it receives, so animated furniture advances at the full `animationFPS` rate (12 steps ahead of avatars, roughly 2x, by default). Each animated layer tracks its own `frameCounter` and a per-frame `remainingFrameRepeats` countdown (`FurnitureAnimatedVisualization`), a data-driven repeat sequence distinct from the avatar's simpler global counter.

## Frame index resolution: modulo, per body part

`AvatarImage._frameCounter` (`src/nitro/avatar/AvatarImage.ts`) is a single, ever-incrementing counter shared across the whole avatar. Each body part resolves *its own* displayed frame independently via modulo against its own frame-array length:

```ts
// AvatarImagePartContainer.getFrameIndex
public getFrameIndex(k: number): number {
    if (!this._frames || !this._frames.length) return 0;
    return k % this._frames.length;
}
```

This is why a `Wave` animation's chest layer (4 frames) and arm layer (2 frames) stay in sync at their own natural periods even though both read from the same ever-growing `_frameCounter`: see [[AVATAR-ANIMATIONS]] for the animation-data format this operates on.

## An unrelated third clock: window motions

`Motions` (`src/nitro/window/motion/Motions.ts`) drives UI window animations (sliding/animating panels) and is **not** part of any of the above: it runs its own `setInterval` loop, only borrowing `GetTickerFPS()` to pick its interval period and `GetTickerTime()` for timestamps. It starts lazily when a motion is queued and stops once none remain. If you're debugging a UI window animation, this is a different system entirely from the room/avatar pipeline.

## Manual frame stepping (no ticker at all)

[[STANDALONE-RENDERING]] doesn't run a room loop: there's no `RoomEngine.update` ticking `AvatarVisualization`. Instead, `imaging.avatar.renderAnimation()` calls `avatarImage.updateAnimationByFrames(1)` directly in a loop, once per exported frame, bypassing every throttle described above. This is intentional: an offscreen render doesn't need to match live playback timing, it just needs N distinct frames.
