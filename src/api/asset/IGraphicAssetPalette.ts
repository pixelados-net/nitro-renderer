import { TextureSource, Texture } from 'pixi.js';

export interface IGraphicAssetPalette
{
    dispose: () => void;
    applyPalette(texture: Texture<TextureSource>): Texture<TextureSource>;
    primaryColor: number;
    secondaryColor: number;
}
