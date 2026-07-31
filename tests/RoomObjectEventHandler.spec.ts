import { describe, expect, it, vi } from 'vitest';
import { IRoomEngineServices, IRoomObject } from '../src/api';
import { EventDispatcher } from '../src/core';
import { RoomObjectStateChangedEvent } from '../src/events';
import { OpenMessageComposer } from '../src/nitro/communication';
import { RoomObjectEventHandler } from '../src/nitro/room/RoomObjectEventHandler';

describe('RoomObjectEventHandler', () =>
{
    it('opens WIRED editors instead of changing their generic furniture state', () =>
    {
        const send = vi.fn();
        const roomEngine = {
            connection: { send },
            events: new EventDispatcher()
        } as unknown as IRoomEngineServices;
        const handler = new RoomObjectEventHandler(roomEngine);
        const object = { id: 42, type: 'wf_act_saymsg' } as IRoomObject;

        handler.handleRoomObjectEvent(
            new RoomObjectStateChangedEvent(RoomObjectStateChangedEvent.STATE_CHANGE, object),
            7
        );

        expect(send).toHaveBeenCalledTimes(1);
        expect(send.mock.calls[0][0]).toBeInstanceOf(OpenMessageComposer);
        expect(send.mock.calls[0][0].getMessageArray()).toEqual([42]);

        handler.dispose();
    });
});
