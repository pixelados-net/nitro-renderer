import { IMessageEvent } from '../../../../../api';
import { MessageEvent } from '../../../../../events';
import { WiredCreatorToolsInspectionParser } from '../../parser';

export class WiredCreatorToolsInspectionEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, WiredCreatorToolsInspectionParser);
    }

    public getParser(): WiredCreatorToolsInspectionParser
    {
        return this.parser as WiredCreatorToolsInspectionParser;
    }
}
