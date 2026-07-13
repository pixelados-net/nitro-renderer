import { afterEach, describe, expect, it, vi } from 'vitest';
import { StandaloneFurnitureData } from '../src/standalone/StandaloneFurnitureData';
import { waitForNitroEvent } from '../src/standalone/waitForNitroEvent';
import { EventDispatcher } from '../src/core';
import { NitroEvent } from '../src/events';

const FURNIDATA = {
    roomitemtypes: {
        furnitype: [
            {
                id: 13,
                classname: 'throne',
                name: 'Throne',
                description: 'For royalty',
                category: 'chair',
                revision: 1,
                defaultdir: 2,
                xdim: 1,
                ydim: 1
            }
        ]
    },
    wallitemtypes: {
        furnitype: [
            {
                id: 4054,
                classname: 'poster',
                name: 'Poster',
                description: 'A poster',
                category: 'wall',
                revision: 1
            }
        ]
    }
};

describe('StandaloneFurnitureData', () =>
{
    afterEach(() => vi.restoreAllMocks());

    it('loads furnidata and exposes floor and wall items', async () =>
    {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(FURNIDATA) }));

        const provider = new StandaloneFurnitureData();

        await provider.load('http://localhost/furnidata.json');

        expect(provider.isReady).toBe(true);

        const items = provider.getAllFurnitureData(null);

        expect(items).toHaveLength(2);
        expect(items.map(item => item.className)).toContain('throne');
        expect(items.map(item => item.className)).toContain('poster');
    });

    it('queues listeners while loading and notifies them when ready', async () =>
    {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(FURNIDATA) }));

        const provider = new StandaloneFurnitureData();
        const listener = { loadFurnitureData: vi.fn() };

        const loading = provider.load('http://localhost/furnidata.json');

        expect(provider.getAllFurnitureData(listener)).toBeNull();
        expect(listener.loadFurnitureData).not.toHaveBeenCalled();

        await loading;

        expect(listener.loadFurnitureData).toHaveBeenCalledTimes(1);
        expect(provider.getAllFurnitureData(listener)).toHaveLength(2);
    });

    it('supports removing pending listeners', async () =>
    {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(FURNIDATA) }));

        const provider = new StandaloneFurnitureData();
        const listener = { loadFurnitureData: vi.fn() };

        const loading = provider.load('http://localhost/furnidata.json');

        provider.getAllFurnitureData(listener);
        provider.removePendingFurniDataListener(listener);

        await loading;

        expect(listener.loadFurnitureData).not.toHaveBeenCalled();
    });
});

describe('waitForNitroEvent', () =>
{
    it('resolves when the event is dispatched and removes the listener', async () =>
    {
        const dispatcher = new EventDispatcher();

        const promise = waitForNitroEvent(dispatcher, 'TEST_EVENT', 1000);

        dispatcher.dispatchEvent(new NitroEvent('TEST_EVENT'));

        const event = await promise;

        expect(event.type).toBe('TEST_EVENT');
    });

    it('rejects on timeout', async () =>
    {
        const dispatcher = new EventDispatcher();

        await expect(waitForNitroEvent(dispatcher, 'NEVER_FIRED', 10)).rejects.toThrow('nitro_imaging_timeout_NEVER_FIRED');
    });
});
