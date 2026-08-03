import { describe, expect, it, vi } from 'vitest';
import { NitroConfiguration, RoomObjectCategory } from '../src/api';
import { RoomContentLoader } from '../src/nitro/room/RoomContentLoader';
import { RoomManager } from '../src/room/RoomManager';

describe('RoomContentLoader orphan furniture', () =>
{
    it('resolves an unknown furniture bundle when its caller supplies the category', () =>
    {
        NitroConfiguration.setValue('furni.asset.url', 'https://assets.example/furniture/%libname%.nitro');

        const loader = new RoomContentLoader();

        expect(loader.getCategoryForType('16_harrypotte2')).toBe(RoomObjectCategory.MINIMUM);
        expect(loader.getAssetUrls('16_harrypotte2')).toBeNull();
        expect(loader.getAssetUrls('16_harrypotte2', null, false, RoomObjectCategory.FLOOR))
            .toEqual(['https://assets.example/furniture/16_harrypotte2.nitro']);
        expect(loader.getPlaceholderName('16_harrypotte2', RoomObjectCategory.WALL)).toBe('place_holder_wall');
    });

    it('forwards the object category while loading an unknown furniture bundle', () =>
    {
        const downloadAsset = vi.fn();
        const getPlaceholderName = vi.fn(() => 'place_holder');
        const loader = {
            dispose: vi.fn(),
            downloadAsset,
            getCollection: vi.fn(() => null),
            getPlaceholderName,
            isLoaderType: vi.fn(() => true)
        };
        const manager = new RoomManager(null, null, null);

        manager.setContentLoader(loader as never);
        manager.createRoomInstance('preview');
        manager.createRoomObjectAndInitalize('preview', 1, '16_harrypotte2', RoomObjectCategory.FLOOR);

        expect(downloadAsset).toHaveBeenCalledWith('16_harrypotte2', manager.events, RoomObjectCategory.FLOOR);
        expect(getPlaceholderName).toHaveBeenCalledWith('16_harrypotte2', RoomObjectCategory.FLOOR);
    });
});
