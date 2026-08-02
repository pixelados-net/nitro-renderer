import { IMessageComposer } from '../../../../../api';

export class WiredCreatorToolsVariableUpdateComposer implements IMessageComposer<unknown[]>
{
    private _data: unknown[];

    constructor(roomId: number, operation: string, scope: number, scopeId: string, name: string, intValue: string, stringValue: string)
    {
        this._data = [roomId, operation, scope, scopeId, name, intValue, stringValue];
    }

    public getMessageArray()
    {
        return this._data;
    }

    public dispose(): void
    {
        return;
    }
}
