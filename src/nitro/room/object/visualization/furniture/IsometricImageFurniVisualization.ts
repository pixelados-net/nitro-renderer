import { Matrix, RenderTexture, Texture, TextureSource } from 'pixi.js';
import { IGraphicAsset } from '../../../../../api';
import { NitroContainer, NitroSprite, NitroTexture, TextureUtils } from '../../../../../pixi-proxy';
import { FurnitureAnimatedVisualization } from './FurnitureAnimatedVisualization';

export class IsometricImageFurniVisualization extends FurnitureAnimatedVisualization
{
    protected static THUMBNAIL: string = 'THUMBNAIL';

    private _thumbnailImageNormal: Texture<TextureSource>;
    private _thumbnailDirection: number;
    private _thumbnailChanged: boolean;
    private _thumbnailLayerId: number;
    private _thumbnailTexture: Texture<TextureSource>;
    protected _hasOutline: boolean;

    constructor()
    {
        super();

        this._thumbnailImageNormal = null;
        this._thumbnailDirection = -1;
        this._thumbnailChanged = false;
        this._thumbnailLayerId = -1;
        this._thumbnailTexture = null;
        this._hasOutline = false;
    }

    public dispose(): void
    {
        this.disposeThumbnailTexture();
        this._thumbnailImageNormal = null;

        super.dispose();
    }

    public get hasThumbnailImage(): boolean
    {
        return (this._thumbnailImageNormal !== null);
    }

    public setThumbnailImages(texture: Texture<TextureSource>): void
    {
        this._thumbnailImageNormal = texture;
        this._thumbnailChanged = true;
    }

    protected updateModel(scale: number): boolean
    {
        const flag = super.updateModel(scale);

        if(!this._thumbnailChanged && (this._thumbnailDirection === this.direction)) return flag;

        this.refreshThumbnail();

        return true;
    }

    protected updateSprite(scale: number, layerId: number): void
    {
        super.updateSprite(scale, layerId);

        if(!this._thumbnailTexture || (this._thumbnailLayerId !== layerId)) return;

        const sprite = this.getSprite(layerId);

        if(!sprite) return;

        sprite.texture = this._thumbnailTexture;
        sprite.offsetY -= 1;
    }

    protected generateTransformedThumbnail(texture: Texture<TextureSource>, asset: IGraphicAsset): Texture<TextureSource>
    {
        let outlineTexture: RenderTexture = null;

        if(this._hasOutline)
        {
            outlineTexture = this.generateOutlinedTexture(texture);
            texture = outlineTexture;
        }

        texture.source.scaleMode = 'linear';

        const textureWidth = texture.width;
        const textureHeight = texture.height;
        const matrix = this.createThumbnailMatrix(asset, textureWidth, textureHeight);
        const bounds = this.calculateTransformedBounds(matrix, textureWidth, textureHeight);

        matrix.tx -= bounds.minX;
        matrix.ty -= bounds.minY;

        const sprite = new NitroSprite(texture);

        sprite.setFromMatrix(matrix);

        const renderTexture = TextureUtils.createRenderTexture(bounds.width, bounds.height);

        TextureUtils.writeToRenderTexture(sprite, renderTexture);

        if(outlineTexture) outlineTexture.destroy(true);

        return renderTexture;
    }

    private refreshThumbnail(): void
    {
        if(this.asset === null) return;

        if(this._thumbnailImageNormal) this.addThumbnailAsset(this._thumbnailImageNormal, 64);
        else
        {
            this.disposeThumbnailTexture();
            this._thumbnailLayerId = -1;
        }

        this._thumbnailChanged = false;
        this._thumbnailDirection = this.direction;
    }

    private addThumbnailAsset(texture: Texture<TextureSource>, scale: number): void
    {
        let layerId = 0;

        while(layerId < this.totalSprites)
        {
            if(this.getLayerTag(scale, this.direction, layerId) === IsometricImageFurniVisualization.THUMBNAIL)
            {
                this._thumbnailLayerId = layerId;

                const assetName = (this.cacheSpriteAssetName(scale, layerId, false) + this.getFrameNumber(scale, layerId));
                const asset = this.getAsset(assetName, layerId);

                if(asset)
                {
                    this.disposeThumbnailTexture();
                    this._thumbnailTexture = this.generateTransformedThumbnail(texture, asset);
                }

                return;
            }

            layerId++;
        }
    }

    private generateOutlinedTexture(texture: Texture<TextureSource>): RenderTexture
    {
        const borderSize = 20;
        const width = (texture.width + (borderSize * 2));
        const height = (texture.height + (borderSize * 2));
        const container = new NitroContainer();
        const background = new NitroSprite(NitroTexture.WHITE);
        const image = new NitroSprite(texture);

        background.tint = 0x000000;
        background.width = width;
        background.height = height;
        image.position.set(borderSize, borderSize);
        container.addChild(background, image);

        const renderTexture = TextureUtils.createRenderTexture(width, height);

        TextureUtils.writeToRenderTexture(container, renderTexture);
        container.destroy({ children: false });

        return renderTexture;
    }

    private createThumbnailMatrix(asset: IGraphicAsset, width: number, height: number): Matrix
    {
        const scaleX = (asset.width / width);
        const scaleY = (asset.height / height);
        const matrix = new Matrix();

        switch(this.direction)
        {
            case 2:
                matrix.set(scaleX, (-0.5 * scaleX), 0, (scaleY / 1.6), 0, (0.5 * scaleX * width));
                break;
            case 0:
            case 4:
                matrix.set(scaleX, (0.5 * scaleX), 0, (scaleY / 1.6), 0, 0);
                break;
            default:
                matrix.set(scaleX, 0, 0, scaleY, 0, 0);
        }

        return matrix;
    }

    private calculateTransformedBounds(matrix: Matrix, width: number, height: number): { minX: number; minY: number; width: number; height: number }
    {
        const corners = [
            { x: matrix.tx, y: matrix.ty },
            { x: (matrix.a * width) + matrix.tx, y: (matrix.b * width) + matrix.ty },
            { x: (matrix.c * height) + matrix.tx, y: (matrix.d * height) + matrix.ty },
            { x: (matrix.a * width) + (matrix.c * height) + matrix.tx, y: (matrix.b * width) + (matrix.d * height) + matrix.ty }
        ];
        const xValues = corners.map(corner => corner.x);
        const yValues = corners.map(corner => corner.y);
        const minX = Math.min(...xValues);
        const minY = Math.min(...yValues);

        return {
            minX,
            minY,
            width: Math.max(1, Math.ceil(Math.max(...xValues) - minX)),
            height: Math.max(1, Math.ceil(Math.max(...yValues) - minY))
        };
    }

    private disposeThumbnailTexture(): void
    {
        if(this._thumbnailTexture instanceof RenderTexture) this._thumbnailTexture.destroy(true);

        this._thumbnailTexture = null;
    }
}
