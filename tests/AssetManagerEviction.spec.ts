import { describe, expect, it } from 'vitest';
import { AssetManager } from '../src/api/asset/AssetManager';
import { IAssetData } from '../src/api/asset/IAssetData';

const createManager = () => new AssetManager();

const addCollection = (manager: AssetManager, name: string) => manager.createCollection(({ name, type: name } as IAssetData), null);

describe('AssetManager collection eviction', () =>
{
    it('keeps every collection when eviction is disabled (default)', () =>
    {
        const manager = createManager();

        for(let i = 0; i < 10; i++) addCollection(manager, `lib_${ i }`);

        expect(manager.collections.size).toBe(10);
    });

    it('evicts the least recently used collections above the limit', () =>
    {
        const manager = createManager();

        manager.setCollectionEvictionLimit(3);

        addCollection(manager, 'lib_a');
        addCollection(manager, 'lib_b');
        addCollection(manager, 'lib_c');

        // touch lib_a so lib_b becomes the oldest
        manager.getCollection('lib_a');

        addCollection(manager, 'lib_d');

        expect(manager.collections.size).toBe(3);
        expect(manager.getCollection('lib_b')).toBeNull();
        expect(manager.getCollection('lib_a')).not.toBeNull();
        expect(manager.getCollection('lib_c')).not.toBeNull();
        expect(manager.getCollection('lib_d')).not.toBeNull();
    });

    it('never evicts protected collections', () =>
    {
        const manager = createManager();

        manager.setCollectionEvictionLimit(2, ['important']);

        addCollection(manager, 'room');
        addCollection(manager, 'important');
        addCollection(manager, 'lib_a');
        addCollection(manager, 'lib_b');

        expect(manager.getCollection('room')).not.toBeNull();
        expect(manager.getCollection('important')).not.toBeNull();
        expect(manager.getCollection('lib_a')).toBeNull();
    });

    it('applies the limit retroactively when configured', () =>
    {
        const manager = createManager();

        for(let i = 0; i < 6; i++) addCollection(manager, `lib_${ i }`);

        manager.setCollectionEvictionLimit(2);

        expect(manager.collections.size).toBe(2);
    });
});
