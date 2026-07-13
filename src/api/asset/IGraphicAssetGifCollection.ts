import { TextureSource, Texture } from 'pixi.js';

export interface IGraphicAssetGifCollection
{
    name: string;
    textures: Texture<TextureSource>[];
    durations: number[];
}
