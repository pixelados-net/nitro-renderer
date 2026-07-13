import { IGetImageListener, Vector3d } from '../api';
import { TextureUtils } from '../pixi-proxy';
import { RoomEngine } from '../nitro/room';

export interface IFurniRenderOptions
{
    classname?: string;
    typeId?: number;
    wallItem?: boolean;
    color?: string;
    direction?: number;
    state?: number;
    frames?: number;
    scale?: number;
    backgroundColor?: number;
    extras?: string;
    timeoutMs?: number;
}

export class FurniImaging
{
    private _roomEngine: RoomEngine;

    constructor(roomEngine: RoomEngine)
    {
        this._roomEngine = roomEngine;
    }

    public render(options: IFurniRenderOptions): Promise<HTMLImageElement>
    {
        let type = options.classname;
        let color = (options.color || '');

        if((options.typeId !== undefined) && this._roomEngine.roomContentLoader)
        {
            if(options.wallItem)
            {
                type = this._roomEngine.roomContentLoader.getFurnitureWallNameForTypeId(options.typeId);
                color = this._roomEngine.roomContentLoader.getFurnitureWallColorIndex(options.typeId).toString();
            }
            else
            {
                type = this._roomEngine.roomContentLoader.getFurnitureFloorNameForTypeId(options.typeId);
                color = this._roomEngine.roomContentLoader.getFurnitureFloorColorIndex(options.typeId).toString();
            }
        }

        if(!type) return Promise.reject(new Error('nitro_imaging_unknown_furni'));

        return new Promise<HTMLImageElement>((resolve, reject) =>
        {
            let settled = false;

            const timeout = setTimeout(() =>
            {
                if(settled) return;

                settled = true;

                reject(new Error('nitro_imaging_furni_timeout'));
            }, (options.timeoutMs || 15000));

            const complete = (image: HTMLImageElement) =>
            {
                if(settled) return;

                settled = true;

                clearTimeout(timeout);

                if(image) resolve(image);
                else reject(new Error('nitro_imaging_furni_failed'));
            };

            const listener: IGetImageListener = {
                imageReady: (id, texture, image) =>
                {
                    if(image) complete(image);
                    else if(texture) complete(TextureUtils.generateImage(texture));
                    else complete(null);
                },
                imageFailed: () => complete(null)
            };

            const imageResult = this._roomEngine.getGenericRoomObjectImage(
                type,
                color,
                new Vector3d((options.direction === undefined) ? 0 : options.direction),
                ((options.scale === undefined) ? 64 : options.scale),
                listener,
                ((options.backgroundColor === undefined) ? 0 : options.backgroundColor),
                (options.extras || null),
                null,
                ((options.state === undefined) ? -1 : options.state),
                ((options.frames === undefined) ? -1 : options.frames));

            if(!imageResult || (imageResult.id === -1))
            {
                complete(null);

                return;
            }

            if((imageResult.id === 0) && imageResult.data) complete(TextureUtils.generateImage(imageResult.data));
        });
    }

    public async renderDataUrl(options: IFurniRenderOptions): Promise<string>
    {
        const image = await this.render(options);

        return (image ? image.src : null);
    }
}
