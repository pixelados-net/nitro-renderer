import { IRoomEngine, RoomObjectCategory } from '../../api';

export function selectWiredCreatorToolsEntity(roomEngine: IRoomEngine, roomId: number, entityType: string, entityId: number | string, roomObjectCategory?: number): boolean
{
    const objectId = (typeof entityId === 'string') ? Number(entityId) : entityId;

    if(!roomEngine || (roomId <= 0) || !Number.isSafeInteger(objectId) || (objectId <= 0)) return false;

    const category = resolveWiredCreatorToolsEntityCategory(entityType, roomObjectCategory);

    if(category === RoomObjectCategory.MINIMUM) return false;

    roomEngine.selectRoomObject(roomId, objectId, category);

    return true;
}

export function resolveWiredCreatorToolsEntityCategory(entityType: string, roomObjectCategory?: number): number
{
    if((roomObjectCategory === RoomObjectCategory.FLOOR) || (roomObjectCategory === RoomObjectCategory.WALL) || (roomObjectCategory === RoomObjectCategory.UNIT)) return roomObjectCategory;

    switch(entityType)
    {
        case 'furni':
        case 'floor':
            return RoomObjectCategory.FLOOR;
        case 'wall':
            return RoomObjectCategory.WALL;
        case 'user':
        case 'bot':
        case 'pet':
            return RoomObjectCategory.UNIT;
        default:
            return RoomObjectCategory.MINIMUM;
    }
}
