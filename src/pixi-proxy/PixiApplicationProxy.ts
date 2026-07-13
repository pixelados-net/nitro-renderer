import { Application, ApplicationOptions } from 'pixi.js';

export class PixiApplicationProxy extends Application
{
    private static INSTANCE: PixiApplicationProxy = null;

    private _ready: Promise<this>;

    /**
     * Pixi 8 initializes applications asynchronously. Keeping this constructor
     * public preserves compatibility with lightweight consumers that subclass
     * the proxy (for example, the floor-plan editor); they can await `ready`
     * before using the renderer or stage.
     */
    public constructor(options?: Partial<ApplicationOptions>)
    {
        super();

        this._ready = options ? this.initializeApplication(options) : Promise.resolve(this);
    }

    public static async create(options: Partial<ApplicationOptions> = {}): Promise<PixiApplicationProxy>
    {
        const application = new PixiApplicationProxy();

        application._ready = application.initializeApplication(options);

        await application._ready;

        PixiApplicationProxy.INSTANCE = application;

        return application;
    }

    private async initializeApplication(options: Partial<ApplicationOptions>): Promise<this>
    {
        await this.init(options);

        this.installLegacyCanvasAliases();

        if(!PixiApplicationProxy.INSTANCE) PixiApplicationProxy.INSTANCE = this;

        return this;
    }

    private installLegacyCanvasAliases(): void
    {
        const renderer = this.renderer as Application['renderer'] & { view?: HTMLCanvasElement };

        // Pixi 7 exposed renderer.view. Older Nitro consumers still read that
        // property, so retain it as a non-owning alias while they move to canvas.
        if(!('view' in renderer))
        {
            Object.defineProperty(renderer, 'view', {
                configurable: true,
                get: () => this.canvas
            });
        }
    }

    /** @deprecated Pixi 8 calls this property `canvas`. */
    public get view(): HTMLCanvasElement
    {
        return this.canvas;
    }

    public get ready(): Promise<this>
    {
        return this._ready;
    }

    public override destroy(...args: Parameters<Application['destroy']>): void
    {
        super.destroy(...args);

        if(PixiApplicationProxy.INSTANCE === this) PixiApplicationProxy.INSTANCE = null;
    }

    public static get instance(): PixiApplicationProxy
    {
        return this.INSTANCE || null;
    }
}
