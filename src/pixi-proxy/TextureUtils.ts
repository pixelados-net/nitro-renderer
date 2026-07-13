import { Container, ExtractSystem, Matrix, Rectangle, Renderer, RenderTexture, SCALE_MODE, Sprite, Texture, TextureSource } from 'pixi.js';
import { PixiApplicationProxy } from './PixiApplicationProxy';

export class TextureUtils
{
    private static _renderer: Renderer = null;

    public static setRenderer(renderer: Renderer): void
    {
        this._renderer = renderer;
    }

    public static generateTexture(displayObject: Container, region: Rectangle = null, scaleMode: number | SCALE_MODE = null, resolution: number = 1): RenderTexture
    {
        if(!displayObject) return null;

        if(scaleMode === null) scaleMode = TextureSource.defaultOptions.scaleMode;

        const normalizedScaleMode = ((typeof scaleMode === 'number') ? ((scaleMode === 0) ? 'nearest' : 'linear') : scaleMode);

        return this.getRenderer().generateTexture({
            target: displayObject,
            frame: region,
            resolution,
            textureSourceOptions: { scaleMode: normalizedScaleMode }
        }) as RenderTexture;
    }

    public static generateTextureFromImage(image: HTMLImageElement): Texture<TextureSource>
    {
        if(!image) return null;

        return Texture.from(image);
    }

    public static cloneTexture(texture: Texture<TextureSource>): Texture<TextureSource>
    {
        if(!texture) return null;

        return new Texture({
            source: texture.source,
            frame: texture.frame.clone(),
            orig: texture.orig.clone(),
            trim: texture.trim?.clone(),
            defaultAnchor: texture.defaultAnchor,
            defaultBorders: texture.defaultBorders,
            rotate: texture.rotate
        });
    }

    public static isValid(texture: Texture<TextureSource>): boolean
    {
        return !!(texture && !texture.destroyed && texture.source && !texture.source.destroyed && texture.width > 0 && texture.height > 0);
    }

    // Pixi 7 made Extract.image() async; building the image from the
    // still-synchronous canvas extraction keeps this API synchronous
    public static generateImage(target: Container | RenderTexture): HTMLImageElement
    {
        if(!target) return null;

        const url = this.generateImageUrl(target);

        if(!url) return null;

        const image = new Image();

        image.src = url;

        return image;
    }

    public static generateImageUrl(target: Container | RenderTexture): string
    {
        if(!target) return null;

        const canvas = this.generateCanvas(target);

        if(!canvas) return null;

        return canvas.toDataURL('image/png');
    }

    public static generateCanvas(target: Container | RenderTexture): HTMLCanvasElement
    {
        if(!target) return null;

        return (this.getExtractor().canvas(target) as HTMLCanvasElement);
    }

    public static clearRenderTexture(renderTexture: RenderTexture): RenderTexture
    {
        if(!renderTexture) return null;

        return this.writeToRenderTexture(new Sprite(Texture.EMPTY), renderTexture);
    }

    public static createRenderTexture(width: number, height: number): RenderTexture
    {
        if((width < 0) || (height < 0)) return null;

        return RenderTexture.create({
            width,
            height
        });
    }

    public static createAndFillRenderTexture(width: number, height: number, color: number = 16777215): RenderTexture
    {
        if((width < 0) || (height < 0)) return null;

        const renderTexture = this.createRenderTexture(width, height);

        return this.clearAndFillRenderTexture(renderTexture, color);
    }

    public static createAndWriteRenderTexture(width: number, height: number, displayObject: Container, transform: Matrix = null): RenderTexture
    {
        if((width < 0) || (height < 0)) return null;

        const renderTexture = this.createRenderTexture(width, height);

        return this.writeToRenderTexture(displayObject, renderTexture, true, transform);
    }

    public static clearAndFillRenderTexture(renderTexture: RenderTexture, color: number = 16777215): RenderTexture
    {
        if(!renderTexture) return null;

        const sprite = new Sprite(Texture.WHITE);

        sprite.tint = color;

        sprite.width = renderTexture.width;
        sprite.height = renderTexture.height;

        return this.writeToRenderTexture(sprite, renderTexture);
    }

    public static writeToRenderTexture(displayObject: Container, renderTexture: RenderTexture, clear: boolean = true, transform: Matrix = null): RenderTexture
    {
        if(!displayObject || !renderTexture) return null;

        this.getRenderer().render({
            container: displayObject,
            target: renderTexture,
            clear,
            transform
        });

        return renderTexture;
    }

    public static getPixels(displayObject: Container | RenderTexture, frame: Rectangle = null): Uint8Array
    {
        const result = this.getExtractor().pixels(frame ? { target: displayObject, frame } : displayObject);

        return Uint8Array.from(result.pixels);
    }

    public static getRenderer(): Renderer
    {
        if(this._renderer) return this._renderer;

        return PixiApplicationProxy.instance.renderer;
    }

    public static getExtractor(): ExtractSystem
    {
        return this.getRenderer().extract;
    }
}
