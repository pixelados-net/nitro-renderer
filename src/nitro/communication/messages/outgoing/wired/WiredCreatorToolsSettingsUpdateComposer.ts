import { IMessageComposer } from '../../../../../api';

export class WiredCreatorToolsSettingsUpdateComposer implements IMessageComposer<ConstructorParameters<typeof WiredCreatorToolsSettingsUpdateComposer>>
{
    private _data: ConstructorParameters<typeof WiredCreatorToolsSettingsUpdateComposer>;

    constructor(roomId: number, liveUpdates: boolean, hideBoxes: boolean)
    {
        this._data = [roomId, liveUpdates, hideBoxes];
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
