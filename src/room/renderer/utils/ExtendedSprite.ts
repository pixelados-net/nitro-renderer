import { Texture, TextureSource } from 'pixi.js';
import { Point } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { AlphaTolerance } from '../../../api';
import { TextureUtils } from '../../../pixi-proxy';

interface NitroHitMap
{
    alpha: Uint8Array;
    width: number;
    height: number;
}

type HittableTextureSource = TextureSource & { _nitroHitMap?: NitroHitMap };

export class ExtendedSprite extends Sprite
{
    private _offsetX: number;
    private _offsetY: number;
    private _tag: string;
    private _alphaTolerance: number;
    private _varyingDepth: boolean;
    private _clickHandling: boolean;

    private _pairedSpriteId: number;
    private _pairedSpriteUpdateCounter: number;

    constructor(texture: Texture<TextureSource> = Texture.EMPTY)
    {
        // Pixi 8 treats an explicit null as a Sprite options object and then
        // attempts to read null.texture. Always construct with a real texture.
        super(texture || Texture.EMPTY);

        // Room sprites may carry an auxiliary visualization container. Pixi 8
        // defaults view objects to leaf nodes, so opt this compatibility
        // wrapper into container behavior explicitly.
        this.allowChildren = true;

        this._offsetX = 0;
        this._offsetY = 0;
        this._tag = '';
        this._alphaTolerance = AlphaTolerance.MATCH_OPAQUE_PIXELS;
        this._varyingDepth = false;
        this._clickHandling = false;

        this._pairedSpriteId = -1;
        this._pairedSpriteUpdateCounter = -1;
    }

    public needsUpdate(pairedSpriteId: number, pairedSpriteUpdateCounter: number): boolean
    {
        if((this._pairedSpriteId === pairedSpriteId) && (this._pairedSpriteUpdateCounter === pairedSpriteUpdateCounter)) return false;

        this._pairedSpriteId = pairedSpriteId;
        this._pairedSpriteUpdateCounter = pairedSpriteUpdateCounter;

        return true;
    }

    public setTexture(texture: Texture<TextureSource>): void
    {
        if(!texture) texture = Texture.EMPTY;

        if(texture === this.texture) return;

        if(texture === Texture.EMPTY)
        {
            this._pairedSpriteId = -1;
            this._pairedSpriteUpdateCounter = -1;
        }

        this.texture = texture;
    }

    public containsPoint(point: Point): boolean
    {
        return ExtendedSprite.containsPoint(this, point);
    }

    public static containsPoint(sprite: ExtendedSprite, point: Point): boolean
    {
        if(!sprite || !point || (sprite.alphaTolerance > 255)) return false;

        if(!(sprite instanceof Sprite)) return false;

        if((sprite.texture === Texture.EMPTY) || (sprite.blendMode !== 'normal')) return;

        const texture = sprite.texture;
        const baseTexture = texture.source;

        if(!texture || !baseTexture || baseTexture.destroyed || !baseTexture.width || !baseTexture.height) return false;

        const x = (point.x * sprite.scale.x);
        const y = (point.y * sprite.scale.y);

        if(!sprite.getLocalBounds().rectangle.contains(x, y)) return false;

        // MATCH_ALL_PIXELS is used by explicit click-target sprites. It must
        // not be reduced to the normal opaque-pixel threshold.
        if(sprite.alphaTolerance < 0) return true;

        const hittableSource = (baseTexture as HittableTextureSource);

        if(!hittableSource._nitroHitMap)
        {
            if(!ExtendedSprite.generateHitMap(baseTexture)) return false;
        }

        const hitMap = hittableSource._nitroHitMap;

        let dx = (x + texture.frame.x);
        let dy = (y + texture.frame.y);

        if(texture.trim)
        {
            dx -= texture.trim.x;
            dy -= texture.trim.y;
        }

        const resolution = (baseTexture.resolution || 1);
        const pixelX = Math.floor(dx * resolution);
        const pixelY = Math.floor(dy * resolution);

        if((pixelX < 0) || (pixelY < 0) || (pixelX >= hitMap.width) || (pixelY >= hitMap.height)) return false;

        const index = (pixelX + (pixelY * hitMap.width));

        return (hitMap.alpha[index] >= sprite.alphaTolerance);
    }

    private static generateHitMap(baseTexture: TextureSource): boolean
    {
        if(!baseTexture) return false;

        const texture = new Texture({ source: baseTexture });
        const sprite = new Sprite(texture);

        try
        {
            // GenerateTextureSystem otherwise defaults to renderer.resolution.
            // On Retina that produced a 2x pixel buffer which the old 1x
            // indexer sampled from the wrong quadrant.
            const result = TextureUtils.getExtractor().pixels({
                target: sprite,
                resolution: (baseTexture.resolution || 1)
            });

            if(!result || !result.pixels || !result.width || !result.height) return false;

            const alpha = new Uint8Array(result.width * result.height);

            for(let index = 0; index < alpha.length; index++) alpha[index] = result.pixels[(index * 4) + 3];

            (baseTexture as HittableTextureSource)._nitroHitMap = {
                alpha,
                width: result.width,
                height: result.height
            };

            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            sprite.destroy();
            texture.destroy();
        }
    }

    public get offsetX(): number
    {
        return this._offsetX;
    }

    public set offsetX(offset: number)
    {
        this._offsetX = offset;
    }

    public get offsetY(): number
    {
        return this._offsetY;
    }

    public set offsetY(offset: number)
    {
        this._offsetY = offset;
    }

    public get tag(): string
    {
        return this._tag;
    }

    public set tag(tag: string)
    {
        this._tag = tag;
    }

    public get alphaTolerance(): number
    {
        return this._alphaTolerance;
    }

    public set alphaTolerance(tolerance: number)
    {
        this._alphaTolerance = tolerance;
    }

    public get varyingDepth(): boolean
    {
        return this._varyingDepth;
    }

    public set varyingDepth(flag: boolean)
    {
        this._varyingDepth = flag;
    }

    public get clickHandling(): boolean
    {
        return this._clickHandling;
    }

    public set clickHandling(flag: boolean)
    {
        this._clickHandling = flag;
    }
}
