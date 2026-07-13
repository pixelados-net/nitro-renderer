import { ImageSource, TextureSource } from 'pixi.js';
import { Data, inflate } from 'pako';
import { BinaryReader } from './BinaryReader';

export class NitroBundle
{
    private static TEXT_DECODER: TextDecoder = new TextDecoder('utf-8');

    private _jsonFile: Object = null;
    private _imageData: Uint8Array = null;
    private _textureSource: TextureSource = null;

    constructor(arrayBuffer: ArrayBuffer)
    {
        this.parse(arrayBuffer);
    }

    public parse(arrayBuffer: ArrayBuffer): void
    {
        const binaryReader = new BinaryReader(arrayBuffer);

        let fileCount = binaryReader.readShort();

        while(fileCount > 0)
        {
            const fileNameLength = binaryReader.readShort();
            const fileName = binaryReader.readBytes(fileNameLength).toString();
            const fileLength = binaryReader.readInt();
            const buffer = binaryReader.readBytes(fileLength);

            if(fileName.endsWith('.json'))
            {
                const decompressed = inflate((buffer.toArrayBuffer() as Data));

                this._jsonFile = JSON.parse(NitroBundle.TEXT_DECODER.decode(decompressed));
            }
            else
            {
                this._imageData = inflate((buffer.toArrayBuffer() as Data));
            }

            fileCount--;
        }
    }

    get jsonFile(): Object
    {
        return this._jsonFile;
    }

    public async decodeTexture(): Promise<TextureSource>
    {
        if(this._textureSource) return this._textureSource;

        if(!this._imageData) return null;

        const data = this._imageData;
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        const bitmap = await createImageBitmap(new Blob([arrayBuffer], { type: 'image/png' }));

        this._textureSource = new ImageSource({
            resource: bitmap,
            autoGarbageCollect: false
        });

        return this._textureSource;
    }

    public get textureSource(): TextureSource
    {
        return this._textureSource;
    }

    /** @deprecated Use textureSource after awaiting decodeTexture(). */
    public get baseTexture(): TextureSource
    {
        return this._textureSource;
    }
}
