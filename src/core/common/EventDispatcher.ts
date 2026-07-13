import { IDisposable, IEventDispatcher, INitroEvent, NitroLogger } from '../../api';
import { Disposable } from './Disposable';

export class EventDispatcher extends Disposable implements IEventDispatcher, IDisposable
{
    private _listeners: Map<string, Function[]>;
    private _dispatching: number;

    constructor()
    {
        super();

        this._listeners = new Map();
        this._dispatching = 0;
    }

    protected onDispose(): void
    {
        this.removeAllListeners();

        super.onDispose();
    }

    public addEventListener(type: string, callback: Function): void
    {
        if(!type || !callback) return;

        const existing = this._listeners.get(type);

        if(!existing)
        {
            this._listeners.set(type, [callback]);

            return;
        }

        // copy-on-write while dispatching: in-flight iterations keep
        // reading the previous array as a stable snapshot
        if(this._dispatching > 0)
        {
            this._listeners.set(type, [...existing, callback]);

            return;
        }

        existing.push(callback);
    }

    public removeEventListener(type: string, callback: any): void
    {
        if(!type || !callback) return;

        const existing = this._listeners.get(type);

        if(!existing || !existing.length) return;

        for(const [i, cb] of existing.entries())
        {
            if(!cb || (cb !== callback)) continue;

            if(this._dispatching > 0)
            {
                const copy = existing.slice();

                copy.splice(i, 1);

                if(!copy.length) this._listeners.delete(type);
                else this._listeners.set(type, copy);

                return;
            }

            existing.splice(i, 1);

            if(!existing.length) this._listeners.delete(type);

            return;
        }
    }

    public dispatchEvent(event: INitroEvent): boolean
    {
        if(!event) return false;

        NitroLogger.events('Dispatched Event', event.type);

        this.processEvent(event);

        return true;
    }

    private processEvent(event: INitroEvent): void
    {
        const existing = this._listeners.get(event.type);

        if(!existing || !existing.length) return;

        // iterate the live array without per-dispatch copies; while
        // _dispatching > 0 any add/remove swaps in a new array, so this
        // reference behaves as a snapshot even if listeners mutate
        this._dispatching++;

        try
        {
            for(let i = 0; i < existing.length; i++)
            {
                const callback = existing[i];

                if(!callback) continue;

                try
                {
                    callback(event);
                }

                catch (err)
                {
                    NitroLogger.error(err.stack);

                    return;
                }
            }
        }

        finally
        {
            this._dispatching--;
        }
    }

    public removeAllListeners(): void
    {
        this._listeners.clear();
    }
}
