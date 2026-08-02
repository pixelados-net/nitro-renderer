import { describe, expect, it, vi } from 'vitest';
import { IConnection, IRoomEngine, RoomObjectCategory } from '../src/api';
import { EvaWireFormat } from '../src/core/communication/codec/evawire/EvaWireFormat';
import { WiredCreatorToolsInspectComposer, WiredCreatorToolsRefreshComposer, WiredCreatorToolsSettingsUpdateComposer, WiredCreatorToolsVariableUpdateComposer, WiredUserClickComposer } from '../src/nitro/communication/messages/outgoing/wired';
import { WiredCreatorToolsInspectionParser, WiredCreatorToolsMutationResultParser, WiredCreatorToolsOpenParser, WiredCreatorToolsSnapshotParser } from '../src/nitro/communication/messages/parser/wired';
import { NitroMessages } from '../src/nitro/communication/NitroMessages';
import { IncomingHeader } from '../src/nitro/communication/messages/incoming';
import { WiredCreatorToolsInspectionEvent, WiredCreatorToolsMutationResultEvent, WiredCreatorToolsOpenEvent, WiredCreatorToolsSnapshotEvent } from '../src/nitro/communication/messages/incoming/wired';
import { OutgoingHeader } from '../src/nitro/communication/messages/outgoing';
import { resolveWiredCreatorToolsEntityCategory, selectWiredCreatorToolsEntity } from '../src/nitro/wired';

const createConnection = (dataBuffer: ArrayBuffer): IConnection => ({ dataBuffer } as IConnection);

const decodePayload = (values: unknown[]) =>
{
    const codec = new EvaWireFormat();
    const writer = codec.encode(6300, values);

    return codec.decode(createConnection(writer.getBuffer()))[0];
};

describe('Wired Creator Tools protocol', () =>
{
    it('parses a versioned snapshot document', () =>
    {
        const document = JSON.stringify({
            schemaVersion: 1,
            room: { id: 7, name: 'WIRED QA' },
            revision: '3',
            usage: {
                wiredFurni: 8,
                maxWiredFurni: 2500,
                effects: 4,
                latestTraceEffects: 3,
                maxEffects: 100,
                stacks: 2,
                latestTraceStacks: 2,
                maxStacks: 100,
                delayed: 0,
                maxDelayed: 100,
                variables: 1,
                maxVariables: 100,
                signals: 0,
                maxSignals: 100,
                executionMicros: 25,
                compileFailures: '0'
            },
            events: [],
            variables: [],
            entities: [],
            permissions: { canInspect: true, canMutate: true, canConfigure: false },
            settings: { liveUpdates: true, hideBoxes: false }
        });
        const parser = new WiredCreatorToolsSnapshotParser();

        expect(parser.parse(decodePayload([1, document]))).toBe(true);
        expect(parser.schemaVersion).toBe(1);
        expect(parser.snapshot.room.id).toBe(7);
        expect(parser.snapshot.usage.effects).toBe(4);
    });

    it('rejects malformed documents without throwing', () =>
    {
        const parser = new WiredCreatorToolsSnapshotParser();

        expect(parser.parse(decodePayload([1, '{']))).toBe(false);
        expect(parser.snapshot).toBeNull();
    });

    it('rejects a document whose schema does not match its envelope', () =>
    {
        const parser = new WiredCreatorToolsSnapshotParser();
        const document = JSON.stringify({
            schemaVersion: 2,
            room: { id: 7, name: 'WIRED QA' },
            revision: '3',
            usage: {},
            events: [],
            variables: [],
            entities: [],
            permissions: {},
            settings: {}
        });

        expect(parser.parse(decodePayload([1, document]))).toBe(false);
    });

    it('parses mutation results', () =>
    {
        const parser = new WiredCreatorToolsMutationResultParser();

        expect(parser.parse(decodePayload([true, 'updated', '{"revision":"4"}']))).toBe(true);
        expect(parser.success).toBe(true);
        expect(parser.code).toBe('updated');
        expect(parser.result.revision).toBe('4');
    });

    it('accepts an empty error result without inventing a document', () =>
    {
        const parser = new WiredCreatorToolsMutationResultParser();

        expect(parser.parse(decodePayload([false, 'permission_denied', '']))).toBe(true);
        expect(parser.success).toBe(false);
        expect(parser.code).toBe('permission_denied');
        expect(parser.document).toBe('');
        expect(parser.result).toBeNull();
    });

    it('still rejects an empty successful mutation result', () =>
    {
        const parser = new WiredCreatorToolsMutationResultParser();

        expect(parser.parse(decodePayload([true, 'updated', '']))).toBe(false);
        expect(parser.result).toBeNull();
    });

    it('parses a versioned inspection document', () =>
    {
        const parser = new WiredCreatorToolsInspectionParser();
        const document = JSON.stringify({
            schemaVersion: 1,
            revision: '9',
            entity: { type: 'user', id: '13', name: 'Milo' },
            variables: [],
            permissions: { canInspect: true, canMutate: false, canConfigure: false }
        });

        expect(parser.parse(decodePayload([1, document]))).toBe(true);
        expect(parser.schemaVersion).toBe(1);
        expect(parser.inspection.entity.id).toBe('13');
    });

    it('rejects malformed and mismatched inspection documents', () =>
    {
        const parser = new WiredCreatorToolsInspectionParser();

        expect(parser.parse(decodePayload([1, '{']))).toBe(false);
        expect(parser.inspection).toBeNull();
        expect(parser.parse(decodePayload([1, JSON.stringify({
            schemaVersion: 2,
            entity: { type: 'user', id: '13', name: 'Milo' },
            variables: [],
            permissions: {}
        })]))).toBe(false);
        expect(parser.inspection).toBeNull();
    });

    it('parses the Creator Tools open room identifier', () =>
    {
        const parser = new WiredCreatorToolsOpenParser();

        expect(parser.parse(decodePayload([77, 'variables']))).toBe(true);
        expect(parser.roomId).toBe(77);
        expect(parser.initialTab).toBe('variables');
        expect(parser.parse(null)).toBe(false);
    });

    it('preserves the wire contract in composers', () =>
    {
        expect(new WiredCreatorToolsRefreshComposer(7).getMessageArray()).toEqual([7]);
        expect(new WiredCreatorToolsVariableUpdateComposer(7, 'set', 2, '9223372036854775807', 'score', '9223372036854775807', 'ready').getMessageArray()).toEqual([7, 'set', 2, '9223372036854775807', 'score', '9223372036854775807', 'ready']);
        expect(new WiredCreatorToolsInspectComposer(7, 'furni', '9223372036854775807').getMessageArray()).toEqual([7, 'furni', '9223372036854775807']);
        expect(new WiredCreatorToolsSettingsUpdateComposer(7, true, false).getMessageArray()).toEqual([7, true, false]);
        expect(new WiredUserClickComposer(13).getMessageArray()).toEqual([13]);
    });

    it('registers the custom headers in the Nitro message table', () =>
    {
        const messages = new NitroMessages();

        expect(messages.events.get(IncomingHeader.WIRED_CREATOR_TOOLS_SNAPSHOT)).toBe(WiredCreatorToolsSnapshotEvent);
        expect(messages.events.get(IncomingHeader.WIRED_CREATOR_TOOLS_MUTATION_RESULT)).toBe(WiredCreatorToolsMutationResultEvent);
        expect(messages.events.get(IncomingHeader.WIRED_CREATOR_TOOLS_INSPECTION)).toBe(WiredCreatorToolsInspectionEvent);
        expect(messages.events.get(IncomingHeader.WIRED_CREATOR_TOOLS_OPEN)).toBe(WiredCreatorToolsOpenEvent);
        expect(messages.composers.get(OutgoingHeader.WIRED_CREATOR_TOOLS_REFRESH)).toBe(WiredCreatorToolsRefreshComposer);
        expect(messages.composers.get(OutgoingHeader.WIRED_CREATOR_TOOLS_VARIABLE_UPDATE)).toBe(WiredCreatorToolsVariableUpdateComposer);
        expect(messages.composers.get(OutgoingHeader.WIRED_CREATOR_TOOLS_INSPECT)).toBe(WiredCreatorToolsInspectComposer);
        expect(messages.composers.get(OutgoingHeader.WIRED_CREATOR_TOOLS_SETTINGS_UPDATE)).toBe(WiredCreatorToolsSettingsUpdateComposer);
        expect(messages.composers.get(OutgoingHeader.WIRED_USER_CLICK)).toBe(WiredUserClickComposer);
    });
});

describe('Wired Creator Tools entity selection', () =>
{
    it('maps supported entities without allocating renderer state', () =>
    {
        expect(resolveWiredCreatorToolsEntityCategory('furni')).toBe(RoomObjectCategory.FLOOR);
        expect(resolveWiredCreatorToolsEntityCategory('wall')).toBe(RoomObjectCategory.WALL);
        expect(resolveWiredCreatorToolsEntityCategory('user')).toBe(RoomObjectCategory.UNIT);
        expect(resolveWiredCreatorToolsEntityCategory('unknown')).toBe(RoomObjectCategory.MINIMUM);
    });

    it('selects a valid room entity through the existing room engine path', () =>
    {
        const selectRoomObject = vi.fn();
        const roomEngine = { selectRoomObject } as unknown as IRoomEngine;

        expect(selectWiredCreatorToolsEntity(roomEngine, 7, 'furni', '9')).toBe(true);
        expect(selectRoomObject).toHaveBeenCalledWith(7, 9, RoomObjectCategory.FLOOR);
        expect(selectWiredCreatorToolsEntity(roomEngine, 0, 'furni', 9)).toBe(false);
    });
});
