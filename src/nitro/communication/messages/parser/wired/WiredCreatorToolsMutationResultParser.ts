import { IMessageDataWrapper, IMessageParser } from '../../../../../api';
import { parseWiredCreatorToolsDocument, WiredCreatorToolsMutationResult } from './WiredCreatorToolsDocument';

export class WiredCreatorToolsMutationResultParser implements IMessageParser
{
    private _success: boolean;
    private _code: string;
    private _document: string;
    private _result: WiredCreatorToolsMutationResult;

    public flush(): boolean
    {
        this._success = false;
        this._code = null;
        this._document = null;
        this._result = null;

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._success = wrapper.readBoolean();
        this._code = wrapper.readString();
        this._document = wrapper.readString();

        if(!this._success && !this._document)
        {
            this._result = null;

            return true;
        }

        this._result = parseWiredCreatorToolsDocument<WiredCreatorToolsMutationResult>(this._document);

        return (this._result !== null);
    }

    public get success(): boolean
    {
        return this._success;
    }

    public get code(): string
    {
        return this._code;
    }

    public get document(): string
    {
        return this._document;
    }

    public get result(): WiredCreatorToolsMutationResult
    {
        return this._result;
    }
}
