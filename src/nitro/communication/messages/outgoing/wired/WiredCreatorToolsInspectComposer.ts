import { IMessageComposer } from '../../../../../api';

export class WiredCreatorToolsInspectComposer implements IMessageComposer<ConstructorParameters<typeof WiredCreatorToolsInspectComposer>>
{
    private _data: ConstructorParameters<typeof WiredCreatorToolsInspectComposer>;

    constructor(roomId: number, entityType: string, entityId: string)
    {
        this._data = [roomId, entityType, entityId];
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
