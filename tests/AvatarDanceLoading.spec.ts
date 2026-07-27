import { describe, expect, it, vi } from 'vitest';
import { AvatarAction } from '../src/api';
import { AvatarImage } from '../src/nitro/avatar/AvatarImage';
import { EffectAssetDownloadLibrary } from '../src/nitro/avatar/EffectAssetDownloadLibrary';

/** Exposes the focused AvatarImage action dependencies for behavioral verification. */
type TestableAvatarImage = {
    /** Contains the sorted action sequence. */
    _sortedActions: { actionType: string; actionParameter: string }[];
    /** Resolves dynamic avatar animation bundles. */
    _effectManager: {
        isAvatarEffectReady: (effect: number) => boolean;
        downloadAvatarEffect: (effect: number, listener: unknown) => void;
        isAvatarAnimationReady: (animation: string) => boolean;
        downloadAvatarAnimation: (animation: string, listener: unknown) => void;
    };
    /** Sorts pending avatar actions. */
    sortActions: () => boolean;
    /** Resets projected avatar actions. */
    resetActions: () => void;
    /** Applies projected actions to avatar parts. */
    setActionsToParts: () => void;
    /** Finishes one avatar action update. */
    endActionAppends: () => void;
};

describe('AvatarImage dance loading', () =>
{
    it('requests the matching dynamic bundle before projecting a dance', () =>
    {
        const downloadAvatarAnimation = vi.fn();
        const image = Object.create(AvatarImage.prototype) as TestableAvatarImage;

        image._sortedActions = [{ actionType: AvatarAction.DANCE, actionParameter: '2' }];
        image._effectManager = {
            isAvatarEffectReady: () => true,
            downloadAvatarEffect: vi.fn(),
            isAvatarAnimationReady: () => false,
            downloadAvatarAnimation
        };
        image.sortActions = () => true;
        image.resetActions = vi.fn();
        image.setActionsToParts = vi.fn();

        image.endActionAppends();

        expect(downloadAvatarAnimation).toHaveBeenCalledWith('dance.2', image);
        expect(image.resetActions).toHaveBeenCalledOnce();
        expect(image.setActionsToParts).toHaveBeenCalledOnce();
    });

    it('does not redownload a dance animation that is already registered', () =>
    {
        const downloadAvatarAnimation = vi.fn();
        const image = Object.create(AvatarImage.prototype) as TestableAvatarImage;

        image._sortedActions = [{ actionType: AvatarAction.DANCE, actionParameter: '1' }];
        image._effectManager = {
            isAvatarEffectReady: () => true,
            downloadAvatarEffect: vi.fn(),
            isAvatarAnimationReady: () => true,
            downloadAvatarAnimation
        };
        image.sortActions = () => true;
        image.resetActions = vi.fn();
        image.setActionsToParts = vi.fn();

        image.endActionAppends();

        expect(downloadAvatarAnimation).not.toHaveBeenCalled();
    });

    it('allows a failed dynamic bundle download to be retried', async () =>
    {
        const animation = { 'dance.2': { name: 'dance.2' } };
        let attempts = 0;
        const assets = {
            getCollection: () => (attempts > 1 ? { data: { animations: animation } } : null),
            downloadAsset: async () =>
            {
                attempts++;

                return attempts > 1;
            }
        };
        const library = new EffectAssetDownloadLibrary('Dance2', '', assets as never, '/%libname%.nitro');

        await library.downloadAsset();
        expect(library.isLoaded).toBe(false);

        await library.downloadAsset();
        expect(library.isLoaded).toBe(true);
        expect(library.animation).toBe(animation);
    });
});
