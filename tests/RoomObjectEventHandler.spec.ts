import { describe, expect, it, vi } from 'vitest';
import { IRoomEngineServices, IRoomObject, RoomObjectCategory, RoomObjectUserType } from '../src/api';
import { EventDispatcher } from '../src/core';
import { RoomObjectMouseEvent, RoomObjectStateChangedEvent } from '../src/events';
import { OpenMessageComposer, WiredUserClickComposer } from '../src/nitro/communication';
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

    it('emits avatar click packets only for another real user', () =>
    {
        const send = vi.fn();
        const roomEngine = {
            connection: { send },
            events: new EventDispatcher(),
            getSelectedRoomObjectData: vi.fn(() => null),
            getRoomObjectCategoryForType: vi.fn(() => RoomObjectCategory.UNIT),
            getRoomObject: vi.fn(() => null),
            getRoomObjectSelectionArrow: vi.fn(() => null),
            isPlayingGame: vi.fn(() => false),
            roomSessionManager: { getSession: vi.fn(() => ({ ownRoomIndex: 5 })) }
        } as unknown as IRoomEngineServices;
        const handler = new RoomObjectEventHandler(roomEngine);

        handler.handleRoomObjectEvent(createClick(7, RoomObjectUserType.USER), 3);
        handler.handleRoomObjectEvent(createClick(5, RoomObjectUserType.USER), 3);
        handler.handleRoomObjectEvent(createClick(8, RoomObjectUserType.BOT), 3);
        handler.handleRoomObjectEvent(createClick(9, RoomObjectUserType.PET), 3);

        const clicks = send.mock.calls
            .map(([composer]) => composer)
            .filter(composer => composer instanceof WiredUserClickComposer);

        expect(clicks).toHaveLength(1);
        expect(clicks[0].getMessageArray()).toEqual([7]);

        handler.dispose();
    });
});

const createClick = (id: number, type: string): RoomObjectMouseEvent => new RoomObjectMouseEvent(
    RoomObjectMouseEvent.CLICK,
    { id, type } as IRoomObject,
    `click-${ id }`
);
