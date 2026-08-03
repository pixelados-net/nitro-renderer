import { Graphics, type PointData } from 'pixi.js';
import { IObjectData, IRoomGeometry, IRoomRenderingCanvas, IVector3D, LegacyDataType, RoomObjectUserType, Vector3d } from '../api';
import { FloorHeightMapMessageParser } from '../nitro/communication';
import { RoomEngine } from '../nitro/room';
import { RoomPlaneParser } from '../nitro/room/object/RoomPlaneParser';
import { LegacyWallGeometry } from '../nitro/room/utils/LegacyWallGeometry';
import { GetTicker, TextureUtils } from '../pixi-proxy';
import { RoomId } from '../room';
import { AvatarImaging } from './AvatarImaging';
import { StandaloneFurnitureData } from './StandaloneFurnitureData';

export interface IRoomItemDefinition
{
    classname?: string;
    typeId?: number;
    wallItem?: boolean;
    x?: number;
    y?: number;
    z?: number;
    location?: IVector3D;
    direction?: number;
    state?: number;
    extras?: string;
    stuffData?: IObjectData;
}

export interface IRoomAvatarDefinition
{
    figure: string;
    gender?: string;
    x?: number;
    y?: number;
    z?: number;
    direction?: number;
    headDirection?: number;
    posture?: string;
    gestureId?: number;
    effect?: number;
}

export interface IRoomFootprintDefinition
{
    x: number;
    y: number;
    z?: number;
    width: number;
    length: number;
    height?: number;
}

export interface IRoomRenderOptions
{
    floorPlan?: string;
    floorType?: string;
    size?: number;
    wallHeight?: number;
    wallType?: string;
    items?: IRoomItemDefinition[];
    avatars?: IRoomAvatarDefinition[];
    width?: number;
    height?: number;
    scale?: number;
    backgroundColor?: number;
    highlightedFootprint?: IRoomFootprintDefinition;
    timeoutMs?: number;
}

const DEFAULT_WALL_ITEM_LOCATION = () => new Vector3d(0.5, 2.3, 1.8);

export class RoomImaging
{
    private static PREVIEW_COUNTER: number = 1000;
    private static CANVAS_ID: number = 1;

    private _roomEngine: RoomEngine;
    private _avatarImaging: AvatarImaging;
    private _furnitureData: StandaloneFurnitureData;

    constructor(roomEngine: RoomEngine, avatarImaging: AvatarImaging, furnitureData: StandaloneFurnitureData)
    {
        this._roomEngine = roomEngine;
        this._avatarImaging = avatarImaging;
        this._furnitureData = furnitureData;
    }

    public async render(options: IRoomRenderOptions): Promise<HTMLImageElement>
    {
        const timeoutMs = (options.timeoutMs || 30000);
        const roomId = RoomId.makeRoomPreviewerId(RoomImaging.PREVIEW_COUNTER++);

        this.createRoom(roomId, options);

        try
        {
            const contentTypes = await this.populate(roomId, options, timeoutMs);

            await this.waitForContentTypes(contentTypes, timeoutMs);

            return await this.snapshot(roomId, options);
        }

        finally
        {
            this._roomEngine.removeRoomInstance(roomId);
        }
    }

    public async renderDataUrl(options: IRoomRenderOptions): Promise<string>
    {
        const image = await this.render(options);

        return (image ? image.src : null);
    }

    private createRoom(roomId: number, options: IRoomRenderOptions): void
    {
        const planeParser = new RoomPlaneParser();

        if(options.floorPlan)
        {
            const modelParser = new FloorHeightMapMessageParser();

            modelParser.flush();
            modelParser.parseModel(options.floorPlan.split('\n').join('\r'), ((options.wallHeight === undefined) ? -1 : options.wallHeight), true);

            const width = modelParser.width;
            const height = modelParser.height;

            planeParser.initializeTileMap(width, height);

            for(let y = 0; y < height; y++)
            {
                for(let x = 0; x < width; x++)
                {
                    planeParser.setTileHeight(x, y, modelParser.getHeight(x, y));
                }
            }

            planeParser.initializeFromTileData(modelParser.wallHeight);

            this._roomEngine.createRoomInstance(roomId, planeParser.getMapData());

            this.initializeWallGeometry(roomId, planeParser, width, height);
        }
        else
        {
            const size = (options.size || 7);

            planeParser.initializeTileMap((size + 2), (size + 2));

            for(let y = 1; y < (1 + size); y++)
            {
                for(let x = 1; x < (1 + size); x++)
                {
                    planeParser.setTileHeight(x, y, 0);
                }
            }

            planeParser.initializeFromTileData();

            this._roomEngine.createRoomInstance(roomId, planeParser.getMapData());

            this.initializeWallGeometry(roomId, planeParser, (size + 2), (size + 2));
        }

        if(options.floorType || options.wallType)
        {
            this._roomEngine.updateRoomInstancePlaneType(
                roomId,
                (options.floorType || null),
                (options.wallType || null)
            );
        }

        planeParser.dispose();
    }

    private initializeWallGeometry(roomId: number, planeParser: RoomPlaneParser, width: number, height: number): void
    {
        const wallGeometry = this._roomEngine.getLegacyWallGeometry(roomId);

        if(!wallGeometry) return;

        wallGeometry.scale = LegacyWallGeometry.DEFAULT_SCALE;
        wallGeometry.initialize(width, height, planeParser.floorHeight);

        for(let y = (height - 1); y >= 0; y--)
        {
            for(let x = (width - 1); x >= 0; x--)
            {
                wallGeometry.setHeight(x, y, planeParser.getTileHeight(x, y));
            }
        }
    }

    private async populate(roomId: number, options: IRoomRenderOptions, timeoutMs: number): Promise<string[]>
    {
        const contentTypes: string[] = [];

        let objectId = 1;

        for(const item of (options.items || []))
        {
            if(!item) continue;

            const direction = new Vector3d((((item.direction === undefined) ? 0 : item.direction) % 8) * 45);
            const state = ((item.state === undefined) ? 0 : item.state);

            if(item.wallItem)
            {
                let typeId = item.typeId;

                if((typeId === undefined) && item.classname) typeId = this._furnitureData.getWallTypeIdByClassName(item.classname);

                if(typeId === undefined) continue;

                const type = this._roomEngine.roomContentLoader.getFurnitureWallNameForTypeId(typeId);

                if(type) contentTypes.push(type);

                this._roomEngine.addFurnitureWall(roomId, objectId, typeId, (item.location || DEFAULT_WALL_ITEM_LOCATION()), direction, state, (item.extras || ''));
            }
            else
            {
                const location = new Vector3d(((item.x === undefined) ? 2 : item.x), ((item.y === undefined) ? 2 : item.y), (item.z || 0));
                const stuffData = (item.stuffData || new LegacyDataType());

                if(item.classname && (item.typeId === undefined))
                {
                    contentTypes.push(item.classname);

                    this._roomEngine.addFurnitureFloorByTypeName(roomId, objectId, item.classname, location, direction, state, stuffData, NaN, -1, 0, -1, '', true, false);
                }
                else if(item.typeId !== undefined)
                {
                    const type = this._roomEngine.roomContentLoader.getFurnitureFloorNameForTypeId(item.typeId);

                    if(type) contentTypes.push(type);

                    this._roomEngine.addFurnitureFloor(roomId, objectId, item.typeId, location, direction, state, stuffData, NaN, -1, 0, -1, '', true, false);
                }
            }

            objectId++;
        }

        for(const avatar of (options.avatars || []))
        {
            if(!avatar || !avatar.figure) continue;

            await this._avatarImaging.ensureFigureReady(avatar.figure, timeoutMs);

            const location = new Vector3d(((avatar.x === undefined) ? 2 : avatar.x), ((avatar.y === undefined) ? 2 : avatar.y), (avatar.z || 0));
            const direction = ((((avatar.direction === undefined) ? 2 : avatar.direction) % 8) * 45);
            const headDirection = (((avatar.headDirection === undefined) ? direction : ((avatar.headDirection % 8) * 45)));

            if(this._roomEngine.addRoomObjectUser(roomId, objectId, location, new Vector3d(direction, 0, 0), headDirection, RoomObjectUserType.getTypeNumber(RoomObjectUserType.USER), avatar.figure))
            {
                if(avatar.gender) this._roomEngine.updateRoomObjectUserFigure(roomId, objectId, avatar.figure, avatar.gender);

                this._roomEngine.updateRoomObjectUserPosture(roomId, objectId, (avatar.posture || 'std'));

                if(avatar.gestureId !== undefined) this._roomEngine.updateRoomObjectUserGesture(roomId, objectId, avatar.gestureId);

                if(avatar.effect !== undefined) this._roomEngine.updateRoomObjectUserEffect(roomId, objectId, avatar.effect);
            }

            objectId++;
        }

        return contentTypes;
    }

    private async waitForContentTypes(types: string[], timeoutMs: number): Promise<void>
    {
        const deadline = (Date.now() + timeoutMs);

        for(const type of types)
        {
            if(!type) continue;

            while(!this._roomEngine.isRoomContentTypeLoaded(type))
            {
                if(Date.now() > deadline) throw new Error('nitro_imaging_room_assets_timeout');

                await new Promise<void>(resolve => setTimeout(resolve, 100));
            }
        }
    }

    private async snapshot(roomId: number, options: IRoomRenderOptions): Promise<HTMLImageElement>
    {
        const width = (options.width || 500);
        const height = (options.height || 400);
        const scale = (options.scale || 64);

        const display = this._roomEngine.getRoomInstanceDisplay(roomId, RoomImaging.CANVAS_ID, width, height, scale);

        if(!display) throw new Error('nitro_imaging_room_canvas_unavailable');

        this._roomEngine.setRoomInstanceRenderingCanvasMask(roomId, RoomImaging.CANVAS_ID, true);

        const geometry = this._roomEngine.getRoomInstanceGeometry(roomId, RoomImaging.CANVAS_ID);

        if(geometry)
        {
            const size = (options.size || 7);

            geometry.adjustLocation(new Vector3d(((size + 2) / 2), ((size + 2) / 2), 0), 30);
        }

        await this.waitTicks(6);

        const canvas = this._roomEngine.getRoomInstanceRenderingCanvas(roomId, RoomImaging.CANVAS_ID);

        if(!canvas) throw new Error('nitro_imaging_room_canvas_unavailable');

        const footprint = this.createFootprintHighlight(canvas, geometry, options.highlightedFootprint);

        if(footprint) canvas.display.addChild(footprint);

        let texture = null;

        try
        {
            texture = canvas.getDisplayAsTexture();
        }
        finally
        {
            if(footprint)
            {
                if(footprint.parent) footprint.parent.removeChild(footprint);

                footprint.destroy();
            }
        }

        if(!texture) throw new Error('nitro_imaging_room_capture_failed');

        const image = TextureUtils.generateImage(texture);

        texture.destroy(true);

        return image;
    }

    private createFootprintHighlight(canvas: IRoomRenderingCanvas, geometry: IRoomGeometry, definition?: IRoomFootprintDefinition): Graphics
    {
        if(!definition || !geometry || !canvas) return null;

        const width = Math.min(20, Math.max(1, Math.round(definition.width)));
        const length = Math.min(20, Math.max(1, Math.round(definition.length)));
        const baseHeight = (definition.z || 0);
        const stackHeight = Math.max(0, (definition.height || 0));
        const graphic = new Graphics();

        for(let x = 0; x < width; x++)
        {
            for(let y = 0; y < length; y++)
            {
                const points = this.projectTile(canvas, geometry, (definition.x + x), (definition.y + y), baseHeight);

                graphic.poly(points, true).fill({ color: 0x2196F3, alpha: 0.28 }).stroke({ color: 0x2196F3, width: 2 });
            }
        }

        if(stackHeight > 0)
        {
            for(let x = 0; x < width; x++)
            {
                for(let y = 0; y < length; y++)
                {
                    const base = this.projectTile(canvas, geometry, (definition.x + x), (definition.y + y), baseHeight);
                    const elevated = this.projectTile(canvas, geometry, (definition.x + x), (definition.y + y), (baseHeight + stackHeight));

                    graphic.poly(elevated, true).fill({ color: 0xFFCC33, alpha: 0.24 }).stroke({ color: 0xEEBB24, width: 2 });

                    if((x === 0) && (y === 0)) graphic.moveTo(base[0].x, base[0].y).lineTo(elevated[0].x, elevated[0].y).stroke({ color: 0xEEBB24, width: 2 });
                    if((x === (width - 1)) && (y === 0)) graphic.moveTo(base[1].x, base[1].y).lineTo(elevated[1].x, elevated[1].y).stroke({ color: 0xEEBB24, width: 2 });
                    if((x === (width - 1)) && (y === (length - 1))) graphic.moveTo(base[2].x, base[2].y).lineTo(elevated[2].x, elevated[2].y).stroke({ color: 0xEEBB24, width: 2 });
                    if((x === 0) && (y === (length - 1))) graphic.moveTo(base[3].x, base[3].y).lineTo(elevated[3].x, elevated[3].y).stroke({ color: 0xEEBB24, width: 2 });
                }
            }
        }

        return graphic;
    }

    private projectTile(canvas: IRoomRenderingCanvas, geometry: IRoomGeometry, x: number, y: number, z: number): PointData[]
    {
        return [
            new Vector3d((x - 0.5), (y - 0.5), z),
            new Vector3d((x + 0.5), (y - 0.5), z),
            new Vector3d((x + 0.5), (y + 0.5), z),
            new Vector3d((x - 0.5), (y + 0.5), z)
        ].map(location =>
        {
            const point = geometry.getScreenPoint(location);

            return { x: (point.x + (canvas.width / 2)), y: (point.y + (canvas.height / 2)) };
        });
    }

    private waitTicks(count: number): Promise<void>
    {
        return new Promise<void>(resolve =>
        {
            const ticker = GetTicker();

            if(!ticker)
            {
                resolve();

                return;
            }

            let remaining = count;

            const onTick = () =>
            {
                remaining--;

                if(remaining > 0) return;

                ticker.remove(onTick);

                resolve();
            };

            ticker.add(onTick);
        });
    }
}
