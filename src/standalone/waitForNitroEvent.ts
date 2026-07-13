import { IEventDispatcher, INitroEvent } from '../api';

export const waitForNitroEvent = (dispatcher: IEventDispatcher, type: string, timeoutMs: number = 30000): Promise<INitroEvent> =>
{
    return new Promise<INitroEvent>((resolve, reject) =>
    {
        const onEvent = (event: INitroEvent) =>
        {
            clearTimeout(timeout);

            dispatcher.removeEventListener(type, onEvent);

            resolve(event);
        };

        const timeout = setTimeout(() =>
        {
            dispatcher.removeEventListener(type, onEvent);

            reject(new Error(`nitro_imaging_timeout_${ type }`));
        }, timeoutMs);

        dispatcher.addEventListener(type, onEvent);
    });
};
