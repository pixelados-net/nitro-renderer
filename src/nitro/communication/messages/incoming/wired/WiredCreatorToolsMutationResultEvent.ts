import { IMessageEvent } from '../../../../../api';
import { MessageEvent } from '../../../../../events';
import { WiredCreatorToolsMutationResultParser } from '../../parser';

export class WiredCreatorToolsMutationResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, WiredCreatorToolsMutationResultParser);
    }

    public getParser(): WiredCreatorToolsMutationResultParser
    {
        return this.parser as WiredCreatorToolsMutationResultParser;
    }
}
