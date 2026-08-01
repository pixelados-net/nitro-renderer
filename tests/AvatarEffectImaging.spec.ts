import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { IAvatarImage, ISpriteDataContainer } from '../src/api';
import { resolveAvatarRenderLayers } from '../src/standalone/AvatarEffectImaging';

/** Creates one dimension-only texture fixture for layer resolution. */
const textureFixture = (width: number, height: number): Texture =>
    ({ width, height } as unknown as Texture);

/** Creates one external additive sprite matching a spotlight declaration. */
const spotlightSprite = (): ISpriteDataContainer => ({
    animation: {} as ISpriteDataContainer['animation'],
    getDirectionOffsetX: () => 0,
    getDirectionOffsetY: () => 0,
    getDirectionOffsetZ: () => -1,
    hasDirections: false,
    hasStaticY: true,
    id: 'fx1_1',
    ink: 33,
    member: 'std_fx1_1_1'
});

describe('resolveAvatarRenderLayers', () =>
{
    it('composes additive external effect sprites around the base avatar', () =>
    {
        const baseTexture = textureFixture(64, 110);
        const effectTexture = textureFixture(61, 34);
        const sprite = spotlightSprite();
        const getAsset = vi.fn(() => ({
            flipH: false,
            flipV: false,
            offsetX: 4,
            offsetY: -16,
            texture: effectTexture
        }));
        const avatarImage = {
            getAsset,
            getCanvasOffsets: () => [0, 0, 0],
            getDirection: () => 2,
            getImage: () => baseTexture,
            getLayerData: () => null,
            getScale: () => 'h',
            getSprites: () => [sprite]
        } as unknown as IAvatarImage;

        const layers = resolveAvatarRenderLayers(avatarImage, 'full');

        expect(getAsset).toHaveBeenCalledWith('h_std_fx1_1_1_0_0');
        expect(layers).toHaveLength(2);
        expect(layers[0]).toMatchObject({
            blendMode: 'add',
            depth: -0.007,
            x: -28,
            y: -16
        });
        expect(layers[1]).toMatchObject({
            blendMode: 'normal',
            depth: -0.01,
            x: -32,
            y: -94
        });
    });
});
