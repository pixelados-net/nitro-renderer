import { TextureSource, Texture } from 'pixi.js';

export class GraphicAssetGifCollection
{
    constructor(
        public name: string,
        public textures: Texture<TextureSource>[],
        public durations: number[]
    )
    {}
}
