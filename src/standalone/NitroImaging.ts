import { IApplicationOptions } from '@pixi/app';
import { ISessionDataManager, NitroConfiguration } from '../api';
import { AvatarRenderEvent, RoomEngineEvent } from '../events';
import { AvatarRenderManager } from '../nitro/avatar';
import '../nitro/Plugins';
import { RoomEngine } from '../nitro/room';
import { RoomObjectVisualizationFactory } from '../nitro/room/object/RoomObjectVisualizationFactory';
import { GetTicker, PixiApplicationProxy } from '../pixi-proxy';
import { RoomManager } from '../room';
import { AvatarImaging } from './AvatarImaging';
import { FurniImaging } from './FurniImaging';
import { RoomImaging } from './RoomImaging';
import { StandaloneFurnitureData } from './StandaloneFurnitureData';
import { waitForNitroEvent } from './waitForNitroEvent';

export interface INitroImagingOptions
{
    configurationUrl?: string;
    configuration?: { [index: string]: any };
    applicationOptions?: Partial<IApplicationOptions>;
    timeoutMs?: number;
}

/**
 * Headless bootstrap of the rendering pipeline: avatar and furni imaging
 * without a websocket connection and without Nitro.bootstrap(). Reuses the
 * running client application when one exists.
 */
export class NitroImaging
{
    private _application: PixiApplicationProxy;
    private _avatarManager: AvatarRenderManager;
    private _roomEngine: RoomEngine;
    private _roomManager: RoomManager;
    private _furnitureData: StandaloneFurnitureData;

    private _avatar: AvatarImaging;
    private _furni: FurniImaging;
    private _room: RoomImaging;

    private _isDisposed: boolean = false;

    public static async create(options: INitroImagingOptions = {}): Promise<NitroImaging>
    {
        const imaging = new NitroImaging();

        await imaging.init(options);

        return imaging;
    }

    private async init(options: INitroImagingOptions): Promise<void>
    {
        const timeoutMs = (options.timeoutMs || 30000);

        if(options.configurationUrl)
        {
            const response = await fetch(options.configurationUrl);

            if(!response.ok) throw new Error('nitro_imaging_invalid_configuration');

            NitroConfiguration.parseConfiguration(await response.json(), true);
        }

        if(options.configuration) NitroConfiguration.parseConfiguration(options.configuration, true);

        if(!PixiApplicationProxy.instance)
        {
            this._application = new PixiApplicationProxy({
                width: 1,
                height: 1,
                autoStart: true,
                sharedTicker: false,
                ...(options.applicationOptions || {})
            });
        }

        const ticker = GetTicker();

        if(ticker)
        {
            ticker.maxFPS = NitroConfiguration.getValue<number>('system.fps.max', 24);

            if(!ticker.started) ticker.start();
        }

        this._avatarManager = new AvatarRenderManager();

        const avatarReady = waitForNitroEvent(this._avatarManager.events, AvatarRenderEvent.AVATAR_RENDER_READY, timeoutMs);

        this._avatarManager.init();

        if(!RoomObjectVisualizationFactory.FALLBACK_AVATAR_MANAGER) RoomObjectVisualizationFactory.FALLBACK_AVATAR_MANAGER = this._avatarManager;

        this._furnitureData = new StandaloneFurnitureData();

        const furnitureDataReady = this._furnitureData.load();

        this._roomEngine = new RoomEngine(null);
        this._roomEngine.sessionDataManager = (this._furnitureData as unknown as ISessionDataManager);

        this._roomManager = new RoomManager(this._roomEngine, this._roomEngine.visualizationFactory, this._roomEngine.logicFactory);
        this._roomEngine.roomManager = this._roomManager;

        const engineReady = waitForNitroEvent(this._roomEngine.events, RoomEngineEvent.ENGINE_INITIALIZED, timeoutMs);

        this._roomEngine.init();

        await Promise.all([avatarReady, furnitureDataReady, engineReady]);

        this._avatar = new AvatarImaging(this._avatarManager);
        this._furni = new FurniImaging(this._roomEngine);
        this._room = new RoomImaging(this._roomEngine, this._avatar, this._furnitureData);
    }

    public dispose(): void
    {
        if(this._isDisposed) return;

        if(RoomObjectVisualizationFactory.FALLBACK_AVATAR_MANAGER === this._avatarManager) RoomObjectVisualizationFactory.FALLBACK_AVATAR_MANAGER = null;

        if(this._roomManager)
        {
            this._roomManager.dispose();

            this._roomManager = null;
        }

        if(this._roomEngine)
        {
            this._roomEngine.dispose();

            this._roomEngine = null;
        }

        if(this._avatarManager)
        {
            this._avatarManager.dispose();

            this._avatarManager = null;
        }

        if(this._application)
        {
            this._application.destroy(true);

            this._application = null;
        }

        this._isDisposed = true;
    }

    public get avatar(): AvatarImaging
    {
        return this._avatar;
    }

    public get furni(): FurniImaging
    {
        return this._furni;
    }

    public get room(): RoomImaging
    {
        return this._room;
    }

    public get roomEngine(): RoomEngine
    {
        return this._roomEngine;
    }

    public get avatarManager(): AvatarRenderManager
    {
        return this._avatarManager;
    }

    public get isDisposed(): boolean
    {
        return this._isDisposed;
    }
}

export const createNitroImaging = (options: INitroImagingOptions = {}): Promise<NitroImaging> => NitroImaging.create(options);
