import { BindResource, Filter, GlProgram, TextureSource } from 'pixi.js';

export const NITRO_FILTER_VERTEX = `
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

const PASSTHROUGH_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;

void main(void)
{
    finalColor = texture(uTexture, vTextureCoord);
}`;

export class NitroFilter extends Filter
{
    public readonly uniforms: Record<string, any>;

    constructor(vertex: string = NITRO_FILTER_VERTEX, fragment: string = PASSTHROUGH_FRAGMENT, uniforms: Record<string, any> = {})
    {
        const uniformStructures: Record<string, { value: any, type: string }> = {};
        const resources: Record<string, BindResource | Record<string, { value: any, type: string }>> = {};

        for(const [name, value] of Object.entries(uniforms))
        {
            if(value instanceof TextureSource)
            {
                resources[name] = value;
            }
            else
            {
                uniformStructures[name] = {
                    value,
                    type: Number.isInteger(value) ? 'i32' : 'f32'
                };
            }
        }

        if(Object.keys(uniformStructures).length) resources.nitroUniforms = uniformStructures;

        super({
            glProgram: GlProgram.from({ vertex, fragment, name: 'nitro-filter' }),
            resources
        });

        this.uniforms = ((this.resources.nitroUniforms as any)?.uniforms || {});
    }
}
