import { BufferImageSource, RenderTexture, Spritesheet, Texture } from 'pixi.js';
import { deflate } from 'pako';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../src/api/asset/AssetManager';
import { IAssetData } from '../src/api/asset/IAssetData';
import { NitroBundle } from '../src/api/utils/NitroBundle';
import { AdjustmentFilter } from '../src/pixi-proxy/adjustment-filter';
import { CopyChannelFilter } from '../src/pixi-proxy/CopyChannelFilter';
import { PaletteMapFilter } from '../src/pixi-proxy/PaletteMapFilter';

const createBundle = (files: Array<{ name: string, data: Uint8Array }>): ArrayBuffer =>
{
    const encoder = new TextEncoder();
    const encoded = files.map(file => ({ ...file, name: encoder.encode(file.name) }));
    const size = 2 + encoded.reduce((total, file) => total + 2 + file.name.length + 4 + file.data.length, 0);
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;

    view.setInt16(offset, encoded.length);
    offset += 2;

    for(const file of encoded)
    {
        view.setInt16(offset, file.name.length);
        offset += 2;
        bytes.set(file.name, offset);
        offset += file.name.length;
        view.setInt32(offset, file.data.length);
        offset += 4;
        bytes.set(file.data, offset);
        offset += file.data.length;
    }

    return buffer;
};

describe('Pixi 8 texture pipeline', () =>
{
    afterEach(() => vi.unstubAllGlobals());

    it('decodes Nitro bundles into a cached ImageSource without base64 conversion', async () =>
    {
        const createImageBitmap = vi.fn().mockResolvedValue({ width: 2, height: 3, close: vi.fn() });

        vi.stubGlobal('createImageBitmap', createImageBitmap);

        const metadata = { name: 'test_bundle', spritesheet: { frames: {}, meta: { scale: '1' } } };
        const bundle = new NitroBundle(createBundle([
            { name: 'test.json', data: deflate(JSON.stringify(metadata)) },
            { name: 'test.png', data: deflate(Uint8Array.from([137, 80, 78, 71])) }
        ]));

        const first = await bundle.decodeTexture();
        const second = await bundle.decodeTexture();

        expect(bundle.jsonFile).toEqual(metadata);
        expect(first).toBe(second);
        expect(bundle.textureSource).toBe(first);
        expect(bundle.baseTexture).toBe(first);
        expect(first.width).toBe(2);
        expect(first.height).toBe(3);
        expect(createImageBitmap).toHaveBeenCalledTimes(1);
    });

    it('creates graphic collections from Pixi 8 spritesheets', async () =>
    {
        const source = new BufferImageSource({
            resource: Uint8Array.from([255, 255, 255, 255]),
            width: 1,
            height: 1
        });
        const data = {
            name: 'test',
            assets: { icon: { source: 'icon', x: 0, y: 0 } },
            spritesheet: {
                frames: {
                    'test_icon.png': {
                        frame: { x: 0, y: 0, w: 1, h: 1 },
                        rotated: false,
                        trimmed: false,
                        spriteSourceSize: { x: 0, y: 0, w: 1, h: 1 },
                        sourceSize: { w: 1, h: 1 }
                    }
                },
                meta: {
                    app: 'nitro-renderer',
                    version: '3.0.0',
                    image: 'test.png',
                    format: 'RGBA8888',
                    size: { w: 1, h: 1 },
                    scale: '1'
                }
            }
        } as IAssetData;
        const spritesheet = new Spritesheet(new Texture({ source }), data.spritesheet);

        await spritesheet.parse();

        const manager = new AssetManager();
        const collection = manager.createCollection(data, spritesheet);

        expect(collection.textureSource).toBe(source);
        expect(collection.getAsset('icon')?.texture).toBe(spritesheet.textures['test_icon.png']);
        expect(manager.getTexture('test_icon')).toBe(spritesheet.textures['test_icon.png']);
    });

    it('constructs every camera and palette filter with Pixi 8 shader resources', () =>
    {
        const mask = RenderTexture.create({ width: 1, height: 1 });
        const adjustment = new AdjustmentFilter({ brightness: 0.75 });
        const palette = new PaletteMapFilter([0xFFFFFFFF]);
        const copy = new CopyChannelFilter(mask, CopyChannelFilter.CHANNEL_RED, CopyChannelFilter.CHANNEL_ALPHA);

        expect(adjustment.brightness).toBe(0.75);
        expect(palette.lut.width).toBe(1);
        expect(copy.resources.mask).toBe(mask.source);

        adjustment.destroy();
        palette.destroy();
        copy.destroy();
        mask.destroy(true);
    });
});
