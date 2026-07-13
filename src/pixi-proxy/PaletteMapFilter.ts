import { NitroBaseTexture } from './NitroBaseTexture';
import { NitroFilter } from './NitroFilter';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    gl_Position = vec4(position, 0.0, 1.0);
    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D lut;
uniform int channel;

void main(void) {
    vec4 currentColor = texture(uTexture, vTextureCoord);
    vec4 adjusted = currentColor;

    if(currentColor.a > 0.0)
    {
        if(channel == 0)
        {
            adjusted = texture(lut, vec2((currentColor.r * 255.0 + 0.5) / 256.0, 0.5));
        } else if(channel == 1) {
            adjusted = texture(lut, vec2((currentColor.g * 255.0 + 0.5) / 256.0, 0.5));
        } else if(channel == 2) {
            adjusted = texture(lut, vec2((currentColor.b * 255.0 + 0.5) / 256.0, 0.5));
        } else if(channel == 3) {
            adjusted = texture(lut, vec2((currentColor.a * 255.0 + 0.5) / 256.0, 0.5));
        }
    }

    finalColor = vec4(adjusted.r, adjusted.g, adjusted.b, currentColor.a);
}`;

export class PaletteMapFilter extends NitroFilter
{
    public static readonly CHANNEL_RED = 0;
    public static readonly CHANNEL_GREEN = 1;
    public static readonly CHANNEL_BLUE = 2;
    public static readonly CHANNEL_ALPHA = 3;

    private _lut: NitroBaseTexture;
    private _channel: number;

    constructor(palette: number[], channel = PaletteMapFilter.CHANNEL_RED)
    {
        let lut: number[] = [];

        lut = PaletteMapFilter.getLutForPalette(palette);

        const texture = NitroBaseTexture.fromBuffer(Uint8Array.from(lut), lut.length / 4, 1, { scaleMode: 0 });

        super(vertex, fragment, { lut: texture, channel });

        this._lut = texture;
        this._channel = channel;
    }

    private static getLutForPalette(data: number[]): number[]
    {
        const lut = [];

        for(let i = 0; i < data.length; i++)
        {
            // R
            lut[(i * 4) + PaletteMapFilter.CHANNEL_RED] = ((data[i] >> 16) & 0xFF);
            // G
            lut[(i * 4) + PaletteMapFilter.CHANNEL_GREEN] = ((data[i] >> 8) & 0xFF);
            // B
            lut[(i * 4) + PaletteMapFilter.CHANNEL_BLUE] = (data[i] & 0xFF);
            // A
            lut[(i * 4) + PaletteMapFilter.CHANNEL_ALPHA] = ((data[i] >> 24) & 0xFF);
        }

        return lut;
    }

    public get lut(): NitroBaseTexture
    {
        return this._lut;
    }

    public get channel(): number
    {
        return this._channel;
    }
}
