import { BLEND_MODES } from 'pixi.js';

export class SpriteUtilities
{
    public static hex2int(hex: string): number
    {
        return parseInt(hex, 16);
    }

    public static inkToBlendMode(ink: string | number): number
    {
        if(ink == 'ADD' || ink == 33) return 1;

        if(ink == 'SUBTRACT') return 28;

        if(ink == 'DARKEN') return 5;

        return 0;
    }

    public static toPixiBlendMode(blendMode: number | string): BLEND_MODES
    {
        if(typeof blendMode === 'string') return blendMode.toLowerCase() as BLEND_MODES;

        switch(blendMode)
        {
            case 1: return 'add';
            case 2: return 'multiply';
            case 3: return 'screen';
            case 4: return 'overlay';
            case 5: return 'darken';
            case 6: return 'lighten';
            case 7: return 'color-dodge';
            case 8: return 'color-burn';
            case 9: return 'hard-light';
            case 10: return 'soft-light';
            case 11: return 'difference';
            case 12: return 'exclusion';
            case 14: return 'saturation';
            case 15: return 'color';
            case 16: return 'luminosity';
            case 17: return 'normal-npm';
            case 18: return 'add-npm';
            case 19: return 'screen-npm';
            case 20: return 'none';
            case 26: return 'erase';
            case 28: return 'subtract';
            default: return 'normal';
        }
    }
}
