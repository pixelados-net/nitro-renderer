import { IAssetManager, IAvatarEffectListener, INitroEvent, NitroConfiguration, NitroLogger } from '../../api';
import { EventDispatcher } from '../../core';
import { AvatarRenderEffectLibraryEvent, AvatarRenderEvent, NitroEvent } from '../../events';
import { AvatarStructure } from './AvatarStructure';
import { EffectAssetDownloadLibrary } from './EffectAssetDownloadLibrary';

export class EffectAssetDownloadManager extends EventDispatcher
{
    public static DOWNLOADER_READY: string = 'EADM_DOWNLOADER_READY';
    public static LIBRARY_LOADED: string = 'EADM_LIBRARY_LOADED';

    private static MAX_DOWNLOADS: number = 2;

    private _assets: IAssetManager;
    private _structure: AvatarStructure;

    private _missingMandatoryLibs: string[];
    private _effectMap: Map<string, EffectAssetDownloadLibrary[]>;
    private _initDownloadBuffer: [string, IAvatarEffectListener, boolean][];
    private _effectListeners: Map<string, IAvatarEffectListener[]>;
    private _animationListeners: Map<string, IAvatarEffectListener[]>;
    private _incompleteEffects: Map<string, EffectAssetDownloadLibrary[]>;
    private _pendingDownloadQueue: EffectAssetDownloadLibrary[];
    private _currentDownloads: EffectAssetDownloadLibrary[];
    private _libraryNames: string[];
    private _isReady: boolean;

    constructor(assets: IAssetManager, structure: AvatarStructure)
    {
        super();

        this._assets = assets;
        this._structure = structure;

        this._missingMandatoryLibs = NitroConfiguration.getValue<string[]>('avatar.mandatory.effect.libraries');
        this._effectMap = new Map();
        this._effectListeners = new Map();
        this._animationListeners = new Map();
        this._incompleteEffects = new Map();
        this._initDownloadBuffer = [];
        this._pendingDownloadQueue = [];
        this._currentDownloads = [];
        this._libraryNames = [];
        this._isReady = false;

        this.onLibraryLoaded = this.onLibraryLoaded.bind(this);
        this.onAvatarRenderReady = this.onAvatarRenderReady.bind(this);

        this.loadEffectMap();

        this._structure.renderManager.events.addEventListener(AvatarRenderEvent.AVATAR_RENDER_READY, this.onAvatarRenderReady);
    }

    private loadEffectMap(): void
    {
        const request = new XMLHttpRequest();

        try
        {
            request.open('GET', NitroConfiguration.getValue<string>('avatar.effectmap.url'));

            request.send();

            request.onloadend = e =>
            {
                if(request.responseText)
                {
                    const data = JSON.parse(request.responseText);

                    this.processEffectMap(data.effects);

                    this.processMissingLibraries();

                    this._isReady = true;

                    this.dispatchEvent(new NitroEvent(EffectAssetDownloadManager.DOWNLOADER_READY));
                }
            };

            request.onerror = e =>
            {
                throw new Error('invalid_avatar_effect_map');
            };
        }

        catch (e)
        {
            NitroLogger.error(e);
        }
    }

    private processEffectMap(data: any): void
    {
        if(!data) return;

        for(const effect of data)
        {
            if(!effect) continue;

            const id = (effect.id as string);
            const lib = (effect.lib as string);
            const revision = (effect.revision || '');

            if(this._libraryNames.indexOf(lib) >= 0) continue;

            this._libraryNames.push(lib);

            const downloadLibrary = new EffectAssetDownloadLibrary(lib, revision, this._assets, NitroConfiguration.getValue<string>('avatar.asset.effect.url'));

            downloadLibrary.addEventListener(AvatarRenderEffectLibraryEvent.DOWNLOAD_COMPLETE, this.onLibraryLoaded);

            let existing = this._effectMap.get(id);

            if(!existing) existing = [];

            existing.push(downloadLibrary);

            this._effectMap.set(id, existing);
        }
    }

    public downloadAvatarEffect(id: number, listener: IAvatarEffectListener): void
    {
        this.downloadAvatarAnimationById(id.toString(), listener, true);
    }

    public downloadAvatarAnimation(id: string, listener: IAvatarEffectListener): void
    {
        this.downloadAvatarAnimationById(id, listener, false);
    }

    private downloadAvatarAnimationById(id: string, listener: IAvatarEffectListener, effect: boolean): void
    {
        if(!this._isReady || !this._structure.renderManager.isReady)
        {
            this._initDownloadBuffer.push([id, listener, effect]);

            return;
        }

        const pendingLibraries = this.getAvatarAnimationPendingLibraries(id);

        if(pendingLibraries && pendingLibraries.length)
        {
            if(listener && !listener.disposed)
            {
                const listenerMap = effect ? this._effectListeners : this._animationListeners;
                let listeners = listenerMap.get(id);

                if(!listeners) listeners = [];

                if(listeners.indexOf(listener) === -1) listeners.push(listener);

                listenerMap.set(id, listeners);
            }

            this._incompleteEffects.set(id, pendingLibraries);

            for(const library of pendingLibraries)
            {
                if(!library) continue;

                this.downloadLibrary(library);
            }
        }
        else
        {
            this.registerLoadedAnimations(id);

            if(!effect && !this._structure.getAnimation(id)) return;

            if(listener && !listener.disposed)
            {
                if(effect) listener.resetEffect(parseInt(id));
                else listener.resetAnimation?.(id);
            }
        }
    }

    private onAvatarRenderReady(event: INitroEvent): void
    {
        if(!event) return;

        for(const [id, listener, effect] of this._initDownloadBuffer)
        {
            this.downloadAvatarAnimationById(id, listener, effect);
        }

        this._initDownloadBuffer = [];
    }

    private onLibraryLoaded(event: AvatarRenderEffectLibraryEvent): void
    {
        if(!event || !event.library) return;

        const loadedEffects: string[] = [];

        this._structure.registerAnimation(event.library.animation);

        for(const [id, libraries] of this._incompleteEffects.entries())
        {
            let isReady = true;

            for(const library of libraries)
            {
                if(!library || library.isLoaded) continue;

                isReady = false;

                break;
            }

            if(isReady)
            {
                loadedEffects.push(id);

                const effectListeners = this._effectListeners.get(id) || [];

                for(const listener of effectListeners)
                {
                    if(!listener || listener.disposed) continue;

                    listener.resetEffect(parseInt(id));
                }

                this._effectListeners.delete(id);

                const animationListeners = this._animationListeners.get(id) || [];

                for(const listener of animationListeners)
                {
                    if(!listener || listener.disposed) continue;

                    listener.resetAnimation?.(id);
                }

                this._animationListeners.delete(id);

                this.dispatchEvent(new NitroEvent(EffectAssetDownloadManager.LIBRARY_LOADED));
            }
        }

        for(const id of loadedEffects) this._incompleteEffects.delete(id);

        this.removeCurrentDownload(event.library.libraryName);
        this.processDownloadQueue();
    }

    public processMissingLibraries(): void
    {
        const libraries = this._missingMandatoryLibs.slice();

        for(const library of libraries)
        {
            if(!library) continue;

            const map = this._effectMap.get(library);

            if(map)
            {
                for(const effect of map)
                {
                    if(!effect) continue;

                    if(effect.isLoaded) this._structure.registerAnimation(effect.animation);
                    else this.downloadLibrary(effect);
                }
            }
        }
    }

    public isAvatarEffectReady(effect: number): boolean
    {
        if(!this._isReady || !this._structure.renderManager.isReady)
        {
            return false;
        }

        return !this.getAvatarAnimationPendingLibraries(effect.toString()).length;
    }

    public isAvatarAnimationReady(animation: string): boolean
    {
        if(!this._isReady || !this._structure.renderManager.isReady)
        {
            return false;
        }

        const pendingLibraries = this.getAvatarAnimationPendingLibraries(animation);

        return !pendingLibraries.length && !!this._structure.getAnimation(animation);
    }

    private getAvatarAnimationPendingLibraries(id: string): EffectAssetDownloadLibrary[]
    {
        const pendingLibraries: EffectAssetDownloadLibrary[] = [];

        if(!this._structure) return pendingLibraries;

        const libraries = this._effectMap.get(id);

        if(libraries)
        {
            for(const library of libraries)
            {
                if(!library || library.isLoaded) continue;

                if(pendingLibraries.indexOf(library) === -1) pendingLibraries.push(library);
            }
        }

        return pendingLibraries;
    }

    private registerLoadedAnimations(id: string): void
    {
        const libraries = this._effectMap.get(id) || [];

        for(const library of libraries)
        {
            if(!library || !library.isLoaded || !library.animation) continue;

            this._structure.registerAnimation(library.animation);
        }
    }

    private downloadLibrary(library: EffectAssetDownloadLibrary): void
    {
        if(!library || library.isLoaded) return;

        if((this._pendingDownloadQueue.indexOf(library) >= 0) || (this._currentDownloads.indexOf(library) >= 0)) return;

        this._pendingDownloadQueue.push(library);

        this.processDownloadQueue();
    }

    private processDownloadQueue(): void
    {
        while(this._pendingDownloadQueue.length && (this._currentDownloads.length < EffectAssetDownloadManager.MAX_DOWNLOADS))
        {
            const library = this._pendingDownloadQueue.shift();

            this._currentDownloads.push(library);

            library.downloadAsset()
                .catch(error => NitroLogger.error(error))
                .finally(() =>
                {
                    if(library.isLoaded) return;

                    this.removeCurrentDownload(library.libraryName);
                    this.processDownloadQueue();
                });
        }
    }

    private removeCurrentDownload(libraryName: string): void
    {
        const index = this._currentDownloads.findIndex(library => library && (library.libraryName === libraryName));

        if(index >= 0) this._currentDownloads.splice(index, 1);
    }
}
