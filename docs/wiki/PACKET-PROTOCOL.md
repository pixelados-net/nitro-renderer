# Packet Protocol

This page is the deep dive into *how* the wire format works and how a raw byte stream becomes typed message objects — the mechanics behind the pipeline introduced in [[NETWORKING]]. If you're adding support for a new server packet, the step-by-step guide near the bottom is what you want.

## The EvaWire wire format

Every packet, in either direction, is framed the same way:

```
┌───────────────┬──────────────┬──────────────────────┐
│ int32 length  │ int16 header │ ...typed payload...   │
└───────────────┴──────────────┴──────────────────────┘
                 └── length bytes ──────────────────────┘
```

The 4-byte length prefix covers the header plus body, but **not itself**. This is implemented by `EvaWireFormat` (`src/core/communication/codec/evawire/EvaWireFormat.ts`), the only `ICodec` implementation in the codebase.

**Encoding** (`EvaWireFormat.encode(header, messages)`): the header is written as a 2-byte short into an inner buffer, then each value in `messages` is type-switched and appended — `Byte`/`Short` wrapper objects write 1/2 raw bytes, a plain `number` writes a 4-byte int, `boolean` writes a single 0/1 byte, `string` writes a 2-byte length prefix followed by UTF-8 bytes, and `ArrayBuffer` is written raw. The finished inner buffer's length is then written as the outer 4-byte prefix, followed by the inner bytes.

**Decoding** (`EvaWireFormat.decode(connection)`) takes the connection itself (not a raw buffer) so it can read *and mutate* `connection.dataBuffer` directly:

```ts
while (connection.dataBuffer.byteLength) {
    if (connection.dataBuffer.byteLength < 4) break;      // wait for more bytes
    const length = readInt32(connection.dataBuffer);
    if (length > connection.dataBuffer.byteLength - 4) break; // body not fully arrived
    const frame = extractFrame(length);                    // header + body
    wrappers.push(new EvaWireDataWrapper(frame.header, frame.body));
    connection.dataBuffer = connection.dataBuffer.slice(length + 4); // consume it
}
```

Because this loop keeps going until it can't extract a full frame, **multiple complete packets arriving in a single websocket message are all decoded in one pass**, and any trailing partial packet is simply left in `dataBuffer` for the next call — which is why `CommunicationManager` re-invokes `processReceivedData()` every engine tick, not only on socket `message` events.

`EvaWireDataWrapper` (`src/core/communication/codec/evawire/EvaWireDataWrapper.ts`) is the resulting per-packet object: it exposes the numeric `header` plus sequential typed readers (`readByte`, `readShort`, `readInt`, `readBoolean`, `readFloat`, `readDouble`, `readString`) that a parser calls in the exact order the server wrote the fields.

`BinaryReader`/`BinaryWriter` (`src/api/utils/BinaryReader.ts`, `BinaryWriter.ts`) are the low-level big-endian byte primitives both the codec and `EvaWireDataWrapper` build on — a growable `Uint8Array` with manual position tracking.

## Composers, parsers and events — the three-layer pattern

Every packet type in `src/nitro/communication/messages/` is represented by up to three small classes, split by direction:

```
messages/
├── outgoing/   composers (application → server)
│   └── OutgoingHeader.ts   — flat table of header id constants
├── incoming/   events (server → application)
│   └── IncomingHeader.ts   — flat table of header id constants
└── parser/     parsers (raw bytes → typed fields), mirrors the incoming tree
```

**A composer** is the outgoing half — a plain class implementing `IMessageComposer<T>` whose only job is to hold constructor arguments and return them as a typed array via `getMessageArray()`. No encoding logic lives here; `EvaWireFormat.encode` does that centrally.

```ts
// outgoing/room/unit/chat/RoomUnitChatComposer.ts
export class RoomUnitChatComposer implements IMessageComposer<[string, number]> {
    constructor(private message: string, private styleId: number) {}
    getMessageArray() { return [this.message, this.styleId]; }
}
```

**A parser** is the incoming half — implements `IMessageParser`, with `flush()` (reset internal fields, called before every parse so a shared instance is safe to reuse) and `parse(wrapper)` (sequential `wrapper.readX()` calls matching the server's field order), then exposes typed getters for the result.

**An event** wraps a parser class so the connection knows which parser to instantiate for a given header id, and carries the application's callback:

```ts
// incoming/room/unit/chat/RoomUnitChatEvent.ts
export class RoomUnitChatEvent extends MessageEvent {
    constructor(callback: (event: RoomUnitChatEvent) => void) {
        super(RoomUnitChatParser, callback);
    }
    getParser(): RoomUnitChatParser { return this.parser as RoomUnitChatParser; }
}
```

**`NitroMessages`** (`src/nitro/communication/NitroMessages.ts`) is the single registry tying every header id to its event/composer class — one giant pair of `Map<number, Function>` built at construction time (`_events.set(IncomingHeader.UNIT_CHAT, RoomUnitChatEvent)`, `_composers.set(OutgoingHeader.UNIT_CHAT, RoomUnitChatComposer)`). `MessageClassManager` (`src/core/communication/messages/MessageClassManager.ts`) consumes this to build the reverse lookups (class → id) used when sending.

## The full incoming pipeline

1. `EvaWireFormat.decode` produces an `IMessageDataWrapper` for each complete frame in the buffer.
2. `SocketConnection` looks up every `IMessageEvent` registered for that packet's header id (there can be more than one listener per header).
3. It instantiates **one** parser (from the first matching event's `parserClass`), calls `flush()` then `parse(wrapper)`.
4. That single parsed instance is assigned to `.parser` on *every* registered event for that header — so N listeners share one parse, not N redundant parses.
5. Each event's `connection` field is set and its callback is invoked.

## Adding a new incoming packet handler

1. Add the header id constant to `IncomingHeader.ts`.
2. Write an `IMessageParser` class under `parser/<domain>/...` reading fields in server order.
3. Write an `IMessageEvent` subclass (extends `MessageEvent`, passes your parser class to `super()`).
4. Register the pair in `NitroMessages.ts`'s `_events` map.
5. At runtime, register a listener:

```ts
Nitro.instance.communication.registerMessageEvent(
    new MyNewPacketEvent(event => {
        const parser = event.getParser();
        // react to parser.someField
    })
);
```

Adding a new **outgoing** packet is steps 1 and 3 mirrored for `OutgoingHeader.ts`/a composer class, registered in `_composers` instead — then simply `connection.send(new MyComposer(...))`.

## `NitroBundle` is not this protocol

`NitroBundle` (`src/api/utils/NitroBundle.ts`) parses `.nitro` **asset** files fetched over plain HTTP (avatar/furni graphics) — it has no `IConnection`, no `ICodec`, and no relationship to EvaWire beyond reusing `BinaryReader` for convenience. Its structure is unrelated: `int16 fileCount`, then per file `int16 nameLength` + name + `int32 fileLength` + raw (zlib-inflated) bytes. If you see "int32 length prefix" in both places, that's coincidence, not shared framing — see the asset pipeline section of [[ARCHITECTURE]] for where this fits.
