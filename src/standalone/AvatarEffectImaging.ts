import { Rectangle, Texture } from 'pixi.js';
import { AvatarScaleType, AvatarSetType, IAvatarImage } from '../api';
import { NitroContainer, NitroSprite, TextureUtils } from '../pixi-proxy';

/** Blend modes supported by standalone avatar effect layers. */
type AvatarLayerBlendMode = 'add' | 'normal';

/** One positioned texture participating in a standalone avatar frame. */
export interface AvatarRenderLayer
{
    blendMode: AvatarLayerBlendMode;
    depth: number;
    flipH: boolean;
    flipV: boolean;
    texture: Texture;
    x: number;
    y: number;
}

/** Pixel scale associated with one avatar image scale identifier. */
const avatarPixelScale = (avatarImage: IAvatarImage): number =>
    (avatarImage.getScale() === AvatarScaleType.SMALL) ? 32 : 64;

/** Wraps a sprite direction into the renderer's eight-direction range. */
const normalizeDirection = (direction: number): number =>
    ((direction % 8) + 8) % 8;

/** Resolves the base avatar and every external animation sprite for one frame. */
export const resolveAvatarRenderLayers = (
    avatarImage: IAvatarImage,
    setType: string
): AvatarRenderLayer[] =>
{
    const texture = avatarImage.getImage(setType, false);

    if(!texture) return [];

    const scale = avatarPixelScale(avatarImage);
    const canvasOffsets = avatarImage.getCanvasOffsets() || [0, 0, 0];
    const direction = avatarImage.getDirection();
    const spriteData = avatarImage.getSprites();
    const layers: AvatarRenderLayer[] = [{
        blendMode: 'normal',
        depth: (-0.01 + (canvasOffsets[2] || 0)),
        flipH: false,
        flipV: false,
        texture,
        x: (((-scale / 2) + (canvasOffsets[0] || 0)) -
            ((texture.width - scale) / 2)),
        y: ((-texture.height + (scale / 4)) + (canvasOffsets[1] || 0))
    }];
    const avatarLayer = spriteData.find(item => item.id === 'avatar');

    if(avatarLayer)
    {
        const data = avatarImage.getLayerData(avatarLayer);
        let offsetX = avatarLayer.getDirectionOffsetX(direction);
        let offsetY = avatarLayer.getDirectionOffsetY(direction);

        if(data)
        {
            offsetX += data.dx;
            offsetY += data.dy;
        }

        if(scale < 48)
        {
            offsetX /= 2;
            offsetY /= 2;
        }

        layers[0].x += offsetX;
        layers[0].y += offsetY;
    }

    const totalSprites = spriteData.filter(item => item.id !== 'avatar').length + 2;

    for(const item of spriteData)
    {
        if(item.id === 'avatar') continue;

        const data = avatarImage.getLayerData(item);
        let frame = 0;
        let offsetX = item.getDirectionOffsetX(direction);
        let offsetY = item.getDirectionOffsetY(direction);
        const offsetZ = item.getDirectionOffsetZ(direction);
        let assetDirection = item.hasDirections ? direction : 0;

        if(data)
        {
            frame = data.animationFrame;
            offsetX += data.dx;
            offsetY += data.dy;
            assetDirection += data.dd;
        }

        if(scale < 48)
        {
            offsetX /= 2;
            offsetY /= 2;
        }

        const assetName = `${avatarImage.getScale()}_${item.member}_${normalizeDirection(assetDirection)}_${frame}`;
        const asset = avatarImage.getAsset(assetName);

        if(!asset || !asset.texture) continue;

        layers.push({
            blendMode: (item.ink === 33) ? 'add' : 'normal',
            depth: (-0.01 - ((0.001 * totalSprites) * offsetZ)),
            flipH: asset.flipH,
            flipV: asset.flipV,
            texture: asset.texture,
            x: ((asset.offsetX - (scale / 2)) + offsetX),
            y: (asset.offsetY + offsetY)
        });
    }

    return layers.sort((left, right) => right.depth - left.depth);
};

/** Expands a stable animation frame rectangle around the supplied layers. */
const expandFrame = (
    frame: Rectangle | undefined,
    layers: AvatarRenderLayer[]
): Rectangle | undefined =>
{
    for(const layer of layers)
    {
        const left = layer.flipH ? layer.x - layer.texture.width : layer.x;
        const top = layer.flipV ? layer.y - layer.texture.height : layer.y;
        const right = left + layer.texture.width;
        const bottom = top + layer.texture.height;

        if(!frame) frame = new Rectangle(left, top, right - left, bottom - top);
        else
        {
            const frameRight = Math.max(frame.right, right);
            const frameBottom = Math.max(frame.bottom, bottom);

            frame.x = Math.min(frame.x, left);
            frame.y = Math.min(frame.y, top);
            frame.width = frameRight - frame.x;
            frame.height = frameBottom - frame.y;
        }
    }

    return frame;
};

/** Renders one frame using the same layer ordering as room avatars. */
const renderFrame = (
    layers: AvatarRenderLayer[],
    frame: Rectangle
): HTMLImageElement =>
{
    const container = new NitroContainer();

    for(const layer of layers)
    {
        const sprite = new NitroSprite(layer.texture);

        sprite.x = layer.x;
        sprite.y = layer.y;
        sprite.blendMode = layer.blendMode;
        if(layer.flipH) sprite.scale.x = -1;
        if(layer.flipV) sprite.scale.y = -1;
        container.addChild(sprite);
    }

    const texture = TextureUtils.generateTexture(container, frame);
    const image = TextureUtils.generateImage(texture);

    texture.destroy(true);
    container.destroy({ children: true });

    return image;
};

/** Renders fixed-size animation frames including external effect sprites. */
export const renderAvatarAnimationFrames = (
    avatarImage: IAvatarImage,
    setType: string,
    frameCount: number
): HTMLImageElement[] =>
{
    let frame: Rectangle | undefined;

    for(let index = 0; index < frameCount; index++)
    {
        frame = expandFrame(frame, resolveAvatarRenderLayers(avatarImage, setType));
        avatarImage.updateAnimationByFrames(1);
    }

    avatarImage.resetAnimationFrameCounter();

    if(!frame) return [];

    const images: HTMLImageElement[] = [];

    for(let index = 0; index < frameCount; index++)
    {
        images.push(renderFrame(resolveAvatarRenderLayers(avatarImage, setType), frame));
        avatarImage.updateAnimationByFrames(1);
    }

    return images;
};
