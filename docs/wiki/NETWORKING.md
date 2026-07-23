# Networking

This page covers the connection layer: how a websocket gets opened, how bytes flow in and out, and which classes own that responsibility. The exact byte format of a packet is a separate, deeper topic: see [[PACKET-PROTOCOL]].

## The problem this layer solves

A game server speaks a binary protocol over a single persistent websocket. The renderer needs to: open that socket, buffer whatever bytes arrive (which may be partial packets, multiple packets, or both), turn complete packets into typed objects application code can react to, and serialize outgoing typed objects back into bytes. Three classes divide that work.

## `SocketConnection`: the socket itself

`SocketConnection` (`src/core/communication/SocketConnection.ts`) wraps a native `WebSocket` and extends `EventDispatcher` (see [[NITRO-CORE]]) so connection lifecycle events are just events like any other.

- `init(socketUrl)` notifies a state listener, then opens the socket, wiring `open`/`close`/`error`/`message` listeners.
- `open`/`close`/`error` are re-dispatched as `SocketConnectionEvent.CONNECTION_OPENED` / `CONNECTION_CLOSED` / `CONNECTION_ERROR` on the connection's own event bus: this is what `NitroCommunicationManager` listens for.
- `message` does **not** dispatch an event directly. The socket requests `ArrayBuffer` messages, optionally decrypts them through the negotiated server-to-client stream, appends them to an internal `dataBuffer`, and calls `processReceivedData()` to attempt decoding. A `FileReader` fallback remains for nonconforming socket implementations that still deliver a `Blob`.
- `dataBuffer` is a public getter/setter because the codec (see [[PACKET-PROTOCOL]]) needs to both read *and* trim it directly: decoding slices off exactly the bytes it consumed, leaving any trailing partial packet in place for next time.

**Readiness gating.** Messages sent or received before the connection is marked ready/authenticated are queued (`_pendingClientMessages` / `_pendingServerMessages`) rather than processed immediately, and flushed once `onReady()` runs. This is what holds outgoing traffic during an SSO/handshake window without the caller needing to know the handshake is in progress.

## The manager layer: two managers, one wraps the other

`CommunicationManager` (`src/core/communication/CommunicationManager.ts`) is the low-level, game-agnostic manager. It just owns a pool of `IConnection`s (`createConnection`) and, on every engine tick, calls `connection.processReceivedData()` on each: this is what retries decoding partial packets on subsequent ticks, not only when a new websocket `message` event arrives.

`NitroCommunicationManager` (`src/nitro/communication/NitroCommunicationManager.ts`) is the Nitro-specific façade application code actually talks to. It **wraps** a `CommunicationManager` instance (composition, not inheritance) and adds:

- `onInit()` creates a connection, registers the full Nitro message table (`NitroMessages`, see [[PACKET-PROTOCOL]]) onto it, attaches opened/closed/error listeners, and calls `connection.init(NitroConfiguration.getValue('socket.url'))`.
- Listens for a "connection authenticated" event and calls `connection.authenticated()`, which flips the readiness gate described above.
- `registerMessageEvent(event)`: the public API application code uses to listen for a specific incoming packet type. It simply forwards to `connection.addMessageEvent(event)`.

```ts
import { Nitro, RoomReadyMessageEvent } from '@nitrots/nitro-renderer';

Nitro.instance.communication.registerMessageEvent(
    new RoomReadyMessageEvent(event => console.log('room ready:', event.parser))
);
```

## Sending a message

Outgoing traffic is symmetric: build a composer instance, hand it to the connection.

```ts
Nitro.instance.communication.connection.send(new RoomUnitChatComposer('hello', 0));
```

`SocketConnection.send()` looks up the numeric header id for the composer's class via `MessageClassManager`, asks the composer for its typed payload array (`getMessageArray()`), encodes it, and writes the result to the socket (a no-op if the socket isn't open yet: see the readiness gate above).

## Optional legacy Diffie and RC4 compatibility

The normal browser security boundary remains WSS/TLS. Servers that also require Habbo's historical in-protocol handshake can enable the compatibility flow in `renderer-config.json`:

```json
{
    "security.diffie.enabled": true,
    "security.diffie.rsa.modulus": "<hexadecimal server RSA modulus>",
    "security.diffie.rsa.exponent": "3"
}
```

The modulus and exponent are public verification material and must match the Pixels server. The RSA private exponent must never be placed in renderer configuration or any browser bundle.

When enabled, `NitroCommunicationDemo` sends Diffie init after `ClientHello`, verifies the RSA-signed prime and generator, returns an RSA-encrypted client public value, verifies the server public value, and derives two independent RC4 stream instances from the shared key. `SocketConnection` activates them only after the plaintext completion response has been parsed, then sends the SSO ticket. When disabled, authentication follows the existing plain protocol path over WSS.

This mode exists for protocol compatibility. RC4 and the legacy 128-bit Diffie parameters are obsolete cryptography and do not replace HTTPS/WSS.

## Receiving a message (high level)

Every complete packet decoded from `dataBuffer` becomes an `IMessageDataWrapper`. `SocketConnection` looks up every registered `IMessageEvent` for that packet's header id, parses the packet body **once** into a shared parser instance, attaches it to every matching event, and invokes each event's callback. The exact wire format, the composer/parser/event class triad, and the step-by-step guide for registering a brand-new packet type all live in [[PACKET-PROTOCOL]]: that page is the natural next stop.

## A note on `.nitro` asset bundles

Avatar and furniture graphics are downloaded over plain HTTP as `.nitro` bundle files, decoded by `NitroBundle` (`src/api/utils/NitroBundle.ts`). This is a **completely separate binary format** from the live EvaWire packet stream described above and in [[PACKET-PROTOCOL]]: same author, unrelated protocol. Don't confuse "the connection is sending EvaWire packets" with "the asset manager is downloading `.nitro` bundles"; they share no code path. See [[ARCHITECTURE]] for where asset downloading fits into the bigger picture.
