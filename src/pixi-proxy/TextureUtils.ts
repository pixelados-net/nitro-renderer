import { BaseTexture, IRenderer, Renderer, RenderTexture, Resource, Texture } from '@pixi/core';
import { DisplayObject } from '@pixi/display';
import { Extract } from '@pixi/extract';
import { Matrix, Rectangle } from '@pixi/math';
import { Sprite } from '@pixi/sprite';
import { PixiApplicationProxy } from './PixiApplicationProxy';

export class TextureUtils
{
    private static _renderer: Renderer | IRenderer = null;

    public static setRenderer(renderer: Renderer | IRenderer): void
    {
        this._renderer = renderer;
    }

    public static generateTexture(displayObject: DisplayObject, region: Rectangle = null, scaleMode: number = null, resolution: number = 1): RenderTexture
    {
        if(!displayObject) return null;

        if(scaleMode === null) scaleMode = BaseTexture.defaultOptions.scaleMode;

        return this.getRenderer().generateTexture(displayObject, {
            scaleMode,
            resolution,
            region
        });
    }

    public static generateTextureFromImage(image: HTMLImageElement): Texture<Resource>
    {
        if(!image) return null;

        return Texture.from(image);
    }

    // Pixi 7 made Extract.image() async; building the image from the
    // still-synchronous canvas extraction keeps this API synchronous
    public static generateImage(target: DisplayObject | RenderTexture): HTMLImageElement
    {
        if(!target) return null;

        const url = this.generateImageUrl(target);

        if(!url) return null;

        const image = new Image();

        image.src = url;

        return image;
    }

    public static generateImageUrl(target: DisplayObject | RenderTexture): string
    {
        if(!target) return null;

        const canvas = this.generateCanvas(target);

        if(!canvas) return null;

        return canvas.toDataURL('image/png');
    }

    public static generateCanvas(target: DisplayObject | RenderTexture): HTMLCanvasElement
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

    public static createAndWriteRenderTexture(width: number, height: number, displayObject: DisplayObject, transform: Matrix = null): RenderTexture
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

    public static writeToRenderTexture(displayObject: DisplayObject, renderTexture: RenderTexture, clear: boolean = true, transform: Matrix = null): RenderTexture
    {
        if(!displayObject || !renderTexture) return null;

        this.getRenderer().render(displayObject, {
            renderTexture,
            clear,
            transform
        });

        return renderTexture;
    }

    public static getPixels(displayObject: DisplayObject | RenderTexture, frame: Rectangle = null): Uint8Array
    {
        return this.getExtractor().pixels(displayObject, frame);
    }

    public static getRenderer(): Renderer | IRenderer
    {
        if(this._renderer) return this._renderer;

        return PixiApplicationProxy.instance.renderer;
    }

    public static getExtractor(): Extract
    {
        return ((this.getRenderer() as Renderer).extract as Extract);
    }
}
