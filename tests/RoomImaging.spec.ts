import { describe, expect, it, vi } from 'vitest';

import { IRoomRenderOptions, RoomImaging } from '../src/standalone/RoomImaging';

interface RoomImagingPrivateApi
{
    createRoom(roomId: number, options: IRoomRenderOptions): void;
}

describe('RoomImaging', () =>
{
    it('applies configured floor and wallpaper materials to preview rooms', () =>
    {
        const roomEngine = {
            createRoomInstance: vi.fn(),
            getLegacyWallGeometry: vi.fn(() => null),
            updateRoomInstancePlaneType: vi.fn()
        };
        const imaging = new RoomImaging(roomEngine as never, {} as never, {} as never);

        (imaging as unknown as RoomImagingPrivateApi).createRoom(41, {
            floorType: '501',
            size: 4,
            wallType: '301'
        });

        expect(roomEngine.updateRoomInstancePlaneType)
            .toHaveBeenCalledWith(41, '501', '301');
    });
});
