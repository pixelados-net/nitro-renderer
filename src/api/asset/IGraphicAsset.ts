import { TextureSource, Texture } from 'pixi.js';
import { Rectangle } from 'pixi.js';

export interface IGraphicAsset
{
    name: string;
    source: string;
    texture: Texture<TextureSource>;
    usesPalette: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    flipH: boolean;
    flipV: boolean;
    rectangle: Rectangle;
}
