import { IFurnitureData, NitroConfiguration } from '../api';
import { FurnitureDataLoader } from '../nitro/session/furniture/FurnitureDataLoader';

interface IFurnitureDataListener
{
    loadFurnitureData(): void;
}

/**
 * Minimal replacement for the parts of ISessionDataManager that
 * RoomContentLoader consumes (getAllFurnitureData / removePendingFurniDataListener),
 * backed directly by the public furnidata JSON. No connection required.
 */
export class StandaloneFurnitureData
{
    private _floorItems: Map<number, IFurnitureData>;
    private _wallItems: Map<number, IFurnitureData>;
    private _pendingListeners: IFurnitureDataListener[];
    private _ready: boolean;

    constructor()
    {
        this._floorItems = new Map();
        this._wallItems = new Map();
        this._pendingListeners = [];
        this._ready = false;
    }

    public load(url: string = null): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            const loader = new FurnitureDataLoader(this._floorItems, this._wallItems, null);

            loader.addEventListener(FurnitureDataLoader.FURNITURE_DATA_READY, () =>
            {
                this._ready = true;

                const listeners = this._pendingListeners.slice();

                this._pendingListeners = [];

                for(const listener of listeners)
                {
                    if(!listener) continue;

                    listener.loadFurnitureData();
                }

                resolve();
            });

            loader.addEventListener(FurnitureDataLoader.FURNITURE_DATA_ERROR, () => reject(new Error('nitro_imaging_invalid_furnidata')));

            loader.loadFurnitureData(url || NitroConfiguration.getValue<string>('furnidata.url'));
        });
    }

    public getAllFurnitureData(listener: IFurnitureDataListener): IFurnitureData[]
    {
        if(!this._ready)
        {
            if(listener && (this._pendingListeners.indexOf(listener) === -1)) this._pendingListeners.push(listener);

            return null;
        }

        const furnitureData: IFurnitureData[] = [];

        for(const data of this._floorItems.values())
        {
            if(!data) continue;

            furnitureData.push(data);
        }

        for(const data of this._wallItems.values())
        {
            if(!data) continue;

            furnitureData.push(data);
        }

        return furnitureData;
    }

    public getFloorTypeIdByClassName(classname: string): number
    {
        if(!classname) return undefined;

        for(const data of this._floorItems.values())
        {
            if(data && (data.className === classname)) return data.id;
        }

        return undefined;
    }

    public getWallTypeIdByClassName(classname: string): number
    {
        if(!classname) return undefined;

        for(const data of this._wallItems.values())
        {
            if(data && (data.className === classname)) return data.id;
        }

        return undefined;
    }

    public removePendingFurniDataListener(listener: IFurnitureDataListener): void
    {
        if(!this._pendingListeners) return;

        const index = this._pendingListeners.indexOf(listener);

        if(index === -1) return;

        this._pendingListeners.splice(index, 1);
    }

    public get isReady(): boolean
    {
        return this._ready;
    }
}
