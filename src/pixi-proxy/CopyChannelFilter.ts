import { Filter, GlProgram, RenderTexture } from 'pixi.js';
import { NITRO_FILTER_VERTEX } from './NitroFilter';

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D mask;

void main(void) {
    vec4 maskColor = texture(mask, vTextureCoord);
    vec4 currentColor = texture(uTexture, vTextureCoord);
    vec4 adjusted = currentColor;

    if(maskColor.r == 0.0 && maskColor.g == 0.0 && maskColor.b == 0.0)
    {
        adjusted.a = 0.0;
    }

    finalColor = vec4(adjusted.r, adjusted.g, adjusted.b, adjusted.a);
}`;

export class CopyChannelFilter extends Filter
{
    public static readonly CHANNEL_RED = 0;
    public static readonly CHANNEL_GREEN = 1;
    public static readonly CHANNEL_BLUE = 2;
    public static readonly CHANNEL_ALPHA = 3;

    constructor(mask: RenderTexture, fromChannel: number, toChannel: number)
    {
        super({
            glProgram: GlProgram.from({
                vertex: NITRO_FILTER_VERTEX,
                fragment,
                name: 'nitro-copy-channel-filter'
            }),
            resources: { mask: mask.source }
        });
    }
}
