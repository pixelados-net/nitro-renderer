import { IMessageComposer } from '../../../../../api';

export class WiredUserClickComposer implements IMessageComposer<ConstructorParameters<typeof WiredUserClickComposer>>
{
    private _data: ConstructorParameters<typeof WiredUserClickComposer>;

    constructor(roomIndex: number)
    {
        this._data = [roomIndex];
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
