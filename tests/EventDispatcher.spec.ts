import { describe, expect, it, vi } from 'vitest';
import { EventDispatcher } from '../src/core';
import { NitroEvent } from '../src/events';

describe('EventDispatcher', () =>
{
    it('dispatches to every listener', () =>
    {
        const dispatcher = new EventDispatcher();
        const first = vi.fn();
        const second = vi.fn();

        dispatcher.addEventListener('T', first);
        dispatcher.addEventListener('T', second);

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('removes listeners', () =>
    {
        const dispatcher = new EventDispatcher();
        const listener = vi.fn();

        dispatcher.addEventListener('T', listener);
        dispatcher.removeEventListener('T', listener);

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(listener).not.toHaveBeenCalled();
    });

    it('a listener added during dispatch is not invoked for that event (snapshot semantics)', () =>
    {
        const dispatcher = new EventDispatcher();
        const late = vi.fn();

        dispatcher.addEventListener('T', () => dispatcher.addEventListener('T', late));

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(late).not.toHaveBeenCalled();

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(late).toHaveBeenCalledTimes(1);
    });

    it('a listener removed during dispatch still receives the in-flight event (snapshot semantics)', () =>
    {
        const dispatcher = new EventDispatcher();
        const second = vi.fn();

        dispatcher.addEventListener('T', () => dispatcher.removeEventListener('T', second));
        dispatcher.addEventListener('T', second);

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(second).toHaveBeenCalledTimes(1);

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(second).toHaveBeenCalledTimes(1);
    });

    it('a listener that throws stops the remaining listeners (historical behavior)', () =>
    {
        const dispatcher = new EventDispatcher();
        const after = vi.fn();

        dispatcher.addEventListener('T', () =>
        {
            throw new Error('boom');
        });
        dispatcher.addEventListener('T', after);

        dispatcher.dispatchEvent(new NitroEvent('T'));

        expect(after).not.toHaveBeenCalled();
    });

    it('supports reentrant dispatches', () =>
    {
        const dispatcher = new EventDispatcher();
        const inner = vi.fn();

        dispatcher.addEventListener('INNER', inner);
        dispatcher.addEventListener('OUTER', () => dispatcher.dispatchEvent(new NitroEvent('INNER')));

        dispatcher.dispatchEvent(new NitroEvent('OUTER'));

        expect(inner).toHaveBeenCalledTimes(1);
    });
});
