import { IMessageDataWrapper, IMessageParser } from '../../../../../api';

export class WiredCreatorToolsOpenParser implements IMessageParser
{
    private _roomId: number;
    private _initialTab: string;

    public flush(): boolean
    {
        this._roomId = 0;
        this._initialTab = 'monitor';

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._roomId = wrapper.readInt();
        this._initialTab = wrapper.readString();

        return true;
    }

    public get roomId(): number
    {
        return this._roomId;
    }

    public get initialTab(): string
    {
        return this._initialTab;
    }
}
