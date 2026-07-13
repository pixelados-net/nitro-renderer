import { describe, expect, it } from 'vitest';
import { AvatarFigureContainer } from '../src/nitro/avatar/AvatarFigureContainer';

describe('AvatarFigureContainer', () =>
{
    const FIGURE = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';

    it('parses every part type of a figure string', () =>
    {
        const container = new AvatarFigureContainer(FIGURE);

        expect(Array.from(container.getPartTypeIds())).toEqual(['hd', 'ch', 'lg', 'sh']);
    });

    it('exposes set ids and color ids per part', () =>
    {
        const container = new AvatarFigureContainer(FIGURE);

        expect(container.getPartSetId('hd')).toBe(180);
        expect(container.getPartColorIds('hd')).toEqual([1]);
        expect(container.getPartSetId('ch')).toBe(210);
        expect(container.getPartColorIds('ch')).toEqual([66]);
    });

    it('parses parts with multiple colors', () =>
    {
        const container = new AvatarFigureContainer('ch-3030-64-1408');

        expect(container.getPartColorIds('ch')).toEqual([64, 1408]);
    });

    it('round-trips through getFigureString', () =>
    {
        const container = new AvatarFigureContainer(FIGURE);

        expect(container.getFigureString()).toBe(FIGURE);
    });

    it('updates and removes parts', () =>
    {
        const container = new AvatarFigureContainer(FIGURE);

        container.updatePart('ha', 1002, [61]);

        expect(container.hasPartType('ha')).toBe(true);
        expect(container.getPartSetId('ha')).toBe(1002);

        container.removePart('ha');

        expect(container.hasPartType('ha')).toBe(false);
    });
});
