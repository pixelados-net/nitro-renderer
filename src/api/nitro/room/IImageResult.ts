import { RenderTexture } from 'pixi.js';

export interface IImageResult
{
    id: number;
    data: RenderTexture;
    image: HTMLImageElement;
    getImage(): HTMLImageElement;
}
