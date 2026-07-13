import { TextureSource, Texture } from 'pixi.js';

export class BadgeInfo
{
    private _image: Texture<TextureSource>;
    private _placeHolder: boolean;

    constructor(image: Texture<TextureSource>, placeHolder: boolean)
    {
        this._image = image;
        this._placeHolder = placeHolder;
    }

    public get image(): Texture<TextureSource>
    {
        return this._image;
    }

    public get placeHolder(): boolean
    {
        return this._placeHolder;
    }
}
