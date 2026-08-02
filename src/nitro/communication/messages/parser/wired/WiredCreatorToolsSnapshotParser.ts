import { IMessageDataWrapper, IMessageParser } from '../../../../../api';
import { isWiredCreatorToolsSnapshot, parseWiredCreatorToolsDocument, WiredCreatorToolsSnapshot } from './WiredCreatorToolsDocument';

export class WiredCreatorToolsSnapshotParser implements IMessageParser
{
    private _schemaVersion: number;
    private _document: string;
    private _snapshot: WiredCreatorToolsSnapshot;

    public flush(): boolean
    {
        this._schemaVersion = 0;
        this._document = null;
        this._snapshot = null;

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._schemaVersion = wrapper.readInt();
        this._document = wrapper.readString();
        this._snapshot = parseWiredCreatorToolsDocument<WiredCreatorToolsSnapshot>(this._document);

        if(!isWiredCreatorToolsSnapshot(this._snapshot) || (this._snapshot.schemaVersion !== this._schemaVersion))
        {
            this._snapshot = null;

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

    public get snapshot(): WiredCreatorToolsSnapshot
    {
        return this._snapshot;
    }
}
