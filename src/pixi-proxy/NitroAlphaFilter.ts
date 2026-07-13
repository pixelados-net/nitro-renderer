import { AlphaFilter } from 'pixi.js';

export class NitroAlphaFilter extends AlphaFilter
{
    public constructor(alpha: number = 1)
    {
        super({ alpha });
    }
}
