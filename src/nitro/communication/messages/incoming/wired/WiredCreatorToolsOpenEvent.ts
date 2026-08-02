import { IMessageEvent } from '../../../../../api';
import { MessageEvent } from '../../../../../events';
import { WiredCreatorToolsOpenParser } from '../../parser';

export class WiredCreatorToolsOpenEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, WiredCreatorToolsOpenParser);
    }

    public getParser(): WiredCreatorToolsOpenParser
    {
        return this.parser as WiredCreatorToolsOpenParser;
    }
}
