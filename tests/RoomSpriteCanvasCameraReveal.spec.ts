import { describe, expect, it } from 'vitest';
import { IRoomObject } from '../src/api';
import { RoomSpriteCanvas } from '../src/room/renderer/RoomSpriteCanvas';

const containerForTest = () => ({
    getRoomObject: (): IRoomObject => null,
    objects: new Map(),
    roomObjectVariableAccurateZ: ''
});

describe('RoomSpriteCanvas camera reveal', () =>
{
    it('hides the scene until RoomEngine positions the real camera', () =>
    {
        const canvas = new RoomSpriteCanvas(containerForTest(), 1, 400, 300, 1);

        // RoomGeometry starts at a hardcoded, room-agnostic default location; the master
        // container must stay hidden until RoomEngine.updateRoomCamera snaps it to the real
        // camera position, or the first frame(s) flash the wrong view before jumping.
        expect(canvas.master.visible).toBe(false);

        canvas.dispose();
    });
});
