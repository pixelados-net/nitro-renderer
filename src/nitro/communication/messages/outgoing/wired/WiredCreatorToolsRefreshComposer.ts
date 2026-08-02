import { IMessageComposer } from '../../../../../api';

export class WiredCreatorToolsRefreshComposer implements IMessageComposer<ConstructorParameters<typeof WiredCreatorToolsRefreshComposer>>
{
    private _data: ConstructorParameters<typeof WiredCreatorToolsRefreshComposer>;

    constructor(roomId: number)
    {
        this._data = [roomId];
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
