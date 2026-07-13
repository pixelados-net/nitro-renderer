
import { TextureSource, Texture } from 'pixi.js';
import { Spritesheet } from 'pixi.js';
import { IAssetData } from './IAssetData';
import { IGraphicAsset } from './IGraphicAsset';
import { IGraphicAssetCollection } from './IGraphicAssetCollection';

export interface IAssetManager
{
    getTexture(name: string): Texture<TextureSource>;
    setTexture(name: string, texture: Texture<TextureSource>): void;
    getAsset(name: string): IGraphicAsset;
    getCollection(name: string): IGraphicAssetCollection;
    createCollection(data: IAssetData, spritesheet: Spritesheet): IGraphicAssetCollection;
    downloadAssets(urls: string[]): Promise<boolean>;
    downloadAsset(url: string): Promise<boolean>;
    setCollectionEvictionLimit(limit: number, protectedNames?: string[]): void;
    collections: Map<string, IGraphicAssetCollection>;
}
