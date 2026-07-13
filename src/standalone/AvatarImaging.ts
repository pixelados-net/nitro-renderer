import { AvatarAction, AvatarScaleType, AvatarSetType, IAvatarImage } from '../api';
import { AvatarRenderManager } from '../nitro/avatar';
import { TextureUtils } from '../pixi-proxy';

export interface IAvatarRenderOptions
{
    figure: string;
    gender?: string;
    direction?: number;
    headDirection?: number;
    posture?: string;
    gesture?: string;
    dance?: number;
    effect?: number;
    expression?: string;
    frame?: number;
    headOnly?: boolean;
    scale?: string;
    timeoutMs?: number;
}

// appendAction expects the action names ('wave', 'blow'...), not the short
// asset codes ('wav', 'blw'); accept both for convenience
const EXPRESSION_ALIASES: { [index: string]: string } = {
    'wav': AvatarAction.EXPRESSION_WAVE,
    'blw': AvatarAction.EXPRESSION_BLOW_A_KISS
};

export class AvatarImaging
{
    private _manager: AvatarRenderManager;

    constructor(manager: AvatarRenderManager)
    {
        this._manager = manager;
    }

    public async render(options: IAvatarRenderOptions): Promise<HTMLImageElement>
    {
        const avatarImage = await this.createAvatarImage(options);

        const setType = (options.headOnly ? AvatarSetType.HEAD : AvatarSetType.FULL);

        try
        {
            return avatarImage.getCroppedImage(setType);
        }

        finally
        {
            avatarImage.dispose();
        }
    }

    public async renderDataUrl(options: IAvatarRenderOptions): Promise<string>
    {
        const image = await this.render(options);

        return (image ? image.src : null);
    }

    /**
     * Renders a sequence of animation frames. Unlike render(), every frame
     * shares the same canvas size, so the sequence can be played or packed
     * into a spritesheet/GIF without jitter.
     */
    public async renderAnimation(options: IAvatarRenderOptions, frameCount: number): Promise<HTMLImageElement[]>
    {
        if(!frameCount || (frameCount < 1)) frameCount = 1;

        const avatarImage = await this.createAvatarImage(options);

        const setType = (options.headOnly ? AvatarSetType.HEAD : AvatarSetType.FULL);
        const images: HTMLImageElement[] = [];

        try
        {
            for(let frame = 0; frame < frameCount; frame++)
            {
                const texture = avatarImage.getImage(setType, false);

                if(texture) images.push(TextureUtils.generateImage(texture));

                avatarImage.updateAnimationByFrames(1);
            }

            return images;
        }

        finally
        {
            avatarImage.dispose();
        }
    }

    private async createAvatarImage(options: IAvatarRenderOptions): Promise<IAvatarImage>
    {
        const timeoutMs = (options.timeoutMs || 15000);

        await this.ensureFigureReady(options.figure, timeoutMs);

        if(options.effect) await this.ensureEffectReady(options.effect, timeoutMs);

        // dance animations live in downloadable effect libraries (dance.1-4)
        // and AvatarImage only auto-downloads EFFECT actions, so fetch them here
        if(options.dance) await this.ensureEffectReady(options.dance, timeoutMs);

        const avatarImage = this._manager.createAvatarImage(options.figure, (options.scale || AvatarScaleType.LARGE), (options.gender || 'M'), null, null);

        if(!avatarImage) throw new Error('nitro_imaging_avatar_unavailable');

        avatarImage.initActionAppends();

        avatarImage.appendAction(AvatarAction.POSTURE, (options.posture || AvatarAction.POSTURE_STAND));

        if(options.gesture) avatarImage.appendAction(AvatarAction.GESTURE, options.gesture);

        if(options.dance) avatarImage.appendAction(AvatarAction.DANCE, options.dance);

        if(options.effect) avatarImage.appendAction(AvatarAction.EFFECT, options.effect);

        if(options.expression) avatarImage.appendAction(EXPRESSION_ALIASES[options.expression] || options.expression);

        avatarImage.setDirection(AvatarSetType.FULL, ((options.direction === undefined) ? 2 : options.direction));

        if(options.headDirection !== undefined) avatarImage.setDirection(AvatarSetType.HEAD, options.headDirection);

        if(options.frame) avatarImage.updateAnimationByFrames(options.frame);

        return avatarImage;
    }

    public ensureFigureReady(figure: string, timeoutMs: number): Promise<void>
    {
        const container = this._manager.createFigureContainer(figure);

        if(this._manager.isFigureContainerReady(container)) return Promise.resolve();

        return new Promise<void>((resolve, reject) =>
        {
            const timeout = setTimeout(() => reject(new Error('nitro_imaging_figure_timeout')), timeoutMs);

            this._manager.downloadAvatarFigure(container, {
                resetFigure: () =>
                {
                    clearTimeout(timeout);

                    resolve();
                },
                dispose: () =>
                {},
                disposed: false
            });
        });
    }

    private ensureEffectReady(effect: number, timeoutMs: number): Promise<void>
    {
        const effectManager = this._manager.effectDownloadManager;

        if(!effectManager || effectManager.isAvatarEffectReady(effect)) return Promise.resolve();

        return new Promise<void>((resolve, reject) =>
        {
            const timeout = setTimeout(() => reject(new Error('nitro_imaging_effect_timeout')), timeoutMs);

            effectManager.downloadAvatarEffect(effect, {
                resetEffect: () =>
                {
                    clearTimeout(timeout);

                    resolve();
                },
                dispose: () =>
                {},
                disposed: false
            });
        });
    }
}
