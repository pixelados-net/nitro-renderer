import { BufferImageSource, Texture, TextureSource } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { TextureUtils } from '../../pixi-proxy';

export class GraphicAssetPalette
{
    private _palette: [number, number, number][];
    private _primaryColor: number;
    private _secondaryColor: number;

    constructor(palette: [number, number, number][], primaryColor: number, secondaryColor: number)
    {
        this._palette = palette;

        while(this._palette.length < 256) this._palette.push([0, 0, 0]);

        this._primaryColor = primaryColor;
        this._secondaryColor = secondaryColor;
    }

    public dispose(): void
    {

    }

    public applyPalette(texture: Texture<TextureSource>): Texture<TextureSource>
    {
        const renderTexture = TextureUtils.createAndWriteRenderTexture(texture.width, texture.height, new Sprite(texture));
        const pixels = TextureUtils.getPixels(renderTexture);

        for(let i = 0; i < pixels.length; i += 4)
        {
            let paletteColor = this._palette[pixels[i + 1]];

            if(paletteColor === undefined) paletteColor = [0, 0, 0];

            pixels[i] = paletteColor[0];
            pixels[i + 1] = paletteColor[1];
            pixels[i + 2] = paletteColor[2];
        }

        const textureSource = new BufferImageSource({
            resource: pixels,
            width: renderTexture.width,
            height: renderTexture.height,
            scaleMode: renderTexture.source.scaleMode
        });

        renderTexture.destroy(true);

        return new Texture({ source: textureSource });
    }

    public get primaryColor(): number
    {
        return this._primaryColor;
    }

    public get secondaryColor(): number
    {
        return this._secondaryColor;
    }
}
