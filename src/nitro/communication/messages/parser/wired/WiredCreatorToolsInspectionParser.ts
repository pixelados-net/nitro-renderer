import { IMessageDataWrapper, IMessageParser } from '../../../../../api';
import { isWiredCreatorToolsInspection, parseWiredCreatorToolsDocument, WiredCreatorToolsInspection } from './WiredCreatorToolsDocument';

export class WiredCreatorToolsInspectionParser implements IMessageParser
{
    private _schemaVersion: number;
    private _document: string;
    private _inspection: WiredCreatorToolsInspection;

    public flush(): boolean
    {
        this._schemaVersion = 0;
        this._document = null;
        this._inspection = null;

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._schemaVersion = wrapper.readInt();
        this._document = wrapper.readString();
        this._inspection = parseWiredCreatorToolsDocument<WiredCreatorToolsInspection>(this._document);

        if(!isWiredCreatorToolsInspection(this._inspection) || (this._inspection.schemaVersion !== this._schemaVersion))
        {
            this._inspection = null;

            return false;
        }

        return true;
    }

    public get schemaVersion(): number
    {
        return this._schemaVersion;
    }

    public get document(): string
    {
        return this._document;
    }

    public get inspection(): WiredCreatorToolsInspection
    {
        return this._inspection;
    }
}
