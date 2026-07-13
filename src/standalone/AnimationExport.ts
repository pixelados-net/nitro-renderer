import { applyPalette, GIFEncoder, quantize } from 'gifenc';

export interface ISpriteSheetResult
{
    canvas: HTMLCanvasElement;
    dataUrl: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
}

export interface IGifExportOptions
{
    delayMs?: number;
    backgroundColor?: string;
    maxColors?: number;
}

const decodeImages = async (images: HTMLImageElement[]): Promise<void> =>
{
    await Promise.all(images.map(image =>
    {
        if(!image || image.complete) return Promise.resolve();

        return image.decode();
    }));
};

const measureFrames = (images: HTMLImageElement[]): { width: number, height: number } =>
{
    let width = 0;
    let height = 0;

    for(const image of images)
    {
        if(!image) continue;

        width = Math.max(width, (image.naturalWidth || image.width));
        height = Math.max(height, (image.naturalHeight || image.height));
    }

    return { width, height };
};

/**
 * Packs a frame sequence into a single horizontal spritesheet canvas.
 */
export const buildSpriteSheet = async (images: HTMLImageElement[]): Promise<ISpriteSheetResult> =>
{
    if(!images || !images.length) return null;

    await decodeImages(images);

    const { width, height } = measureFrames(images);

    if(!width || !height) return null;

    const canvas = document.createElement('canvas');

    canvas.width = (width * images.length);
    canvas.height = height;

    const context = canvas.getContext('2d');

    for(const [index, image] of images.entries())
    {
        if(!image) continue;

        context.drawImage(image, (index * width) + ((width - (image.naturalWidth || image.width)) / 2), (height - (image.naturalHeight || image.height)));
    }

    return {
        canvas,
        dataUrl: canvas.toDataURL('image/png'),
        frameWidth: width,
        frameHeight: height,
        frameCount: images.length
    };
};

/**
 * Encodes a frame sequence as an animated GIF and returns it as a Blob.
 */
export const encodeGif = async (images: HTMLImageElement[], options: IGifExportOptions = {}): Promise<Blob> =>
{
    if(!images || !images.length) return null;

    await decodeImages(images);

    const { width, height } = measureFrames(images);

    if(!width || !height) return null;

    const delay = (options.delayMs || 100);
    const maxColors = (options.maxColors || 256);

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    const encoder = GIFEncoder();

    for(const image of images)
    {
        if(!image) continue;

        context.clearRect(0, 0, width, height);

        if(options.backgroundColor)
        {
            context.fillStyle = options.backgroundColor;
            context.fillRect(0, 0, width, height);
        }

        context.drawImage(image, ((width - (image.naturalWidth || image.width)) / 2), (height - (image.naturalHeight || image.height)));

        const { data } = context.getImageData(0, 0, width, height);

        const format = (options.backgroundColor ? 'rgb565' : 'rgba4444');
        const palette = quantize(data, maxColors, { format });
        const index = applyPalette(data, palette, format);

        encoder.writeFrame(index, width, height, {
            palette,
            delay,
            transparent: !options.backgroundColor,
            dispose: (options.backgroundColor ? -1 : 2)
        });
    }

    encoder.finish();

    return new Blob([(encoder.bytes() as unknown as BlobPart)], { type: 'image/gif' });
};
