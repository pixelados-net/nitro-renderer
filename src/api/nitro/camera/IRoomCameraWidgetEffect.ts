import { TextureSource, Texture } from 'pixi.js';
import { ColorMatrix } from 'pixi.js';

export interface IRoomCameraWidgetEffect
{
    name: string;
    minLevel: number;
    texture: Texture<TextureSource>;
    colorMatrix: ColorMatrix;
    blendMode: number;
}
