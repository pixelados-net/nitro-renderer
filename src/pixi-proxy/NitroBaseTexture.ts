import { BufferImageSource, SCALE_MODE } from 'pixi.js';

export class NitroBaseTexture extends BufferImageSource
{
    public static fromBuffer(buffer: Uint8Array, width: number, height: number, options: { scaleMode?: number | SCALE_MODE } = {}): NitroBaseTexture
    {
        const scaleMode = ((typeof options.scaleMode === 'number') ? ((options.scaleMode === 0) ? 'nearest' : 'linear') : options.scaleMode);

        return new NitroBaseTexture({
            resource: buffer,
            width,
            height,
            scaleMode: (scaleMode || 'nearest'),
            autoGarbageCollect: false
        });
    }
}
