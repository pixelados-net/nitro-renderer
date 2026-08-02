import { IMessageEvent } from '../../../../../api';
import { MessageEvent } from '../../../../../events';
import { WiredCreatorToolsSnapshotParser } from '../../parser';

export class WiredCreatorToolsSnapshotEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, WiredCreatorToolsSnapshotParser);
    }

    public getParser(): WiredCreatorToolsSnapshotParser
    {
        return this.parser as WiredCreatorToolsSnapshotParser;
    }
}
