import { SpritesheetData as PixiSpritesheet } from 'pixi.js';
import { ISpritesheetMeta } from './ISpritesheetMeta';

export interface SpritesheetData extends PixiSpritesheet
{
    meta: ISpritesheetMeta;
}
