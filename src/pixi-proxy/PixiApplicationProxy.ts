import { Application, ApplicationOptions } from 'pixi.js';

export class PixiApplicationProxy extends Application
{
    private static INSTANCE: PixiApplicationProxy = null;

    private constructor()
    {
        super();
    }

    public static async create(options: Partial<ApplicationOptions> = {}): Promise<PixiApplicationProxy>
    {
        const application = new PixiApplicationProxy();

        await application.init(options);

        PixiApplicationProxy.INSTANCE = application;

        return application;
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
