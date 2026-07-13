import { describe, expect, it } from 'vitest';
import { IConnection } from '../src/api';
import { Byte } from '../src/core/communication/codec/Byte';
import { EvaWireFormat } from '../src/core/communication/codec/evawire/EvaWireFormat';
import { Short } from '../src/core/communication/codec/Short';

const createConnection = (dataBuffer: ArrayBuffer): IConnection => ({ dataBuffer } as IConnection);

describe('EvaWireFormat', () =>
{
    const codec = new EvaWireFormat();

    it('round-trips a message through encode and decode', () =>
    {
        const writer = codec.encode(4000, [new Byte(1), new Short(2), 3, true, 'hola']);

        expect(writer).not.toBeNull();

        const connection = createConnection(writer.getBuffer());
        const wrappers = codec.decode(connection);

        expect(wrappers).toHaveLength(1);

        const wrapper = wrappers[0];

        expect(wrapper.header).toBe(4000);
        expect(wrapper.readByte()).toBe(1);
        expect(wrapper.readShort()).toBe(2);
        expect(wrapper.readInt()).toBe(3);
        expect(wrapper.readBoolean()).toBe(true);
        expect(wrapper.readString()).toBe('hola');
    });

    it('decodes multiple packets from a single buffer', () =>
    {
        const first = codec.encode(1, [10]).getBuffer();
        const second = codec.encode(2, ['abc']).getBuffer();

        const merged = new Uint8Array(first.byteLength + second.byteLength);

        merged.set(new Uint8Array(first), 0);
        merged.set(new Uint8Array(second), first.byteLength);

        const wrappers = codec.decode(createConnection(merged.buffer));

        expect(wrappers).toHaveLength(2);
        expect(wrappers[0].header).toBe(1);
        expect(wrappers[0].readInt()).toBe(10);
        expect(wrappers[1].header).toBe(2);
        expect(wrappers[1].readString()).toBe('abc');
    });

    it('keeps incomplete packets in the buffer', () =>
    {
        const buffer = codec.encode(7, [123]).getBuffer();
        const partial = buffer.slice(0, buffer.byteLength - 2);

        const connection = createConnection(partial);
        const wrappers = codec.decode(connection);

        expect(wrappers).toHaveLength(0);
        expect(connection.dataBuffer.byteLength).toBe(partial.byteLength);
    });
});
