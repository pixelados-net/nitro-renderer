import { describe, expect, it } from 'vitest';
import { SessionDataManager } from '../src/nitro/session/SessionDataManager';

/** Exposes the focused private packet adapter for behavioral verification. */
type TestableSessionDataManager = {
    /** Handles one name-change result packet. */
    onChangeNameUpdateEvent: (event: unknown) => void;
    /** Stores the current visible username. */
    userName: string;
    /** Reports whether another self-service rename is allowed. */
    canChangeName: boolean;
};

describe('SessionDataManager name changes', () =>
{
    it('updates the canonical session name from a successful result packet', () =>
    {
        const manager = new SessionDataManager({} as never) as unknown as TestableSessionDataManager;

        manager.onChangeNameUpdateEvent({
            connection: {},
            getParser: () => ({ resultCode: 0, name: 'Renamed' })
        });

        expect(manager.userName).toBe('Renamed');
        expect(manager.canChangeName).toBe(false);
    });
});
