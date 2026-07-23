import { IConnection, INitroCommunicationDemo, INitroCommunicationManager, NitroConfiguration, NitroLogger } from '../../api';
import { DiffieHandshake, LegacyRSA, NitroManager, RC4Cipher } from '../../core';
import { NitroCommunicationDemoEvent, SocketConnectionEvent } from '../../events';
import { GetTickerTime } from '../../pixi-proxy';
import { Nitro } from '../Nitro';
import { AuthenticatedEvent, ClientHelloMessageComposer, ClientPingEvent, CompleteDiffieHandshakeEvent, CompleteDiffieHandshakeMessageComposer, InfoRetrieveMessageComposer, InitDiffieHandshakeEvent, InitDiffieHandshakeMessageComposer, PongMessageComposer, SSOTicketMessageComposer } from './messages';

export class NitroCommunicationDemo extends NitroManager implements INitroCommunicationDemo
{
    private _communication: INitroCommunicationManager;

    private _handShaking: boolean;
    private _didConnect: boolean;

    private _pongInterval: any;
    private _diffie: DiffieHandshake;
    private _rsa: LegacyRSA;

    constructor(communication: INitroCommunicationManager)
    {
        super();

        this._communication = communication;

        this._handShaking = false;
        this._didConnect = false;

        this._pongInterval = null;
        this._diffie = null;
        this._rsa = null;

        this.onConnectionOpenedEvent = this.onConnectionOpenedEvent.bind(this);
        this.onConnectionClosedEvent = this.onConnectionClosedEvent.bind(this);
        this.onConnectionErrorEvent = this.onConnectionErrorEvent.bind(this);
        this.sendPong = this.sendPong.bind(this);
    }

    protected onInit(): void
    {
        const connection = this._communication.connection;

        if(connection)
        {
            connection.addEventListener(SocketConnectionEvent.CONNECTION_OPENED, this.onConnectionOpenedEvent);
            connection.addEventListener(SocketConnectionEvent.CONNECTION_CLOSED, this.onConnectionClosedEvent);
            connection.addEventListener(SocketConnectionEvent.CONNECTION_ERROR, this.onConnectionErrorEvent);
        }

        this._communication.registerMessageEvent(new ClientPingEvent(this.onClientPingEvent.bind(this)));
        this._communication.registerMessageEvent(new AuthenticatedEvent(this.onAuthenticatedEvent.bind(this)));
        this._communication.registerMessageEvent(new InitDiffieHandshakeEvent(this.onInitDiffieHandshakeEvent.bind(this)));
        this._communication.registerMessageEvent(new CompleteDiffieHandshakeEvent(this.onCompleteDiffieHandshakeEvent.bind(this)));
    }

    protected onDispose(): void
    {
        const connection = this._communication.connection;

        if(connection)
        {
            connection.removeEventListener(SocketConnectionEvent.CONNECTION_OPENED, this.onConnectionOpenedEvent);
            connection.removeEventListener(SocketConnectionEvent.CONNECTION_CLOSED, this.onConnectionClosedEvent);
            connection.removeEventListener(SocketConnectionEvent.CONNECTION_ERROR, this.onConnectionErrorEvent);
        }

        this._handShaking = false;
        this._diffie = null;
        this._rsa = null;

        this.stopPonging();

        super.onDispose();
    }

    private onConnectionOpenedEvent(event: Event): void
    {
        const connection = this._communication.connection;

        if(!connection) return;

        this._didConnect = true;

        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_ESTABLISHED, connection);

        if(NitroConfiguration.getValue<boolean>('system.pong.manually', false)) this.startPonging();

        this.startHandshake(connection);

        connection.send(new ClientHelloMessageComposer(null, null, null, null));

        if(this.diffieEnabled())
        {
            connection.send(new InitDiffieHandshakeMessageComposer());
        }
        else
        {
            this.tryAuthentication(connection);
        }
    }

    private onConnectionClosedEvent(event: CloseEvent): void
    {
        const connection = this._communication.connection;

        if(!connection) return;

        this.stopPonging();

        if(this._didConnect) this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_CLOSED, connection);
    }

    private onConnectionErrorEvent(event: CloseEvent): void
    {
        const connection = this._communication.connection;

        if(!connection) return;

        this.stopPonging();

        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_ERROR, connection);
    }

    private tryAuthentication(connection: IConnection): void
    {
        if(!connection || !this.getSSO())
        {
            if(!this.getSSO())
            {
                NitroLogger.error('Login without an SSO ticket is not supported');
            }

            this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKE_FAILED, connection);

            return;
        }

        connection.send(new SSOTicketMessageComposer(this.getSSO(), GetTickerTime()));
    }

    private onClientPingEvent(event: ClientPingEvent): void
    {
        if(!event || !event.connection) return;

        this.sendPong(event.connection);
    }

    private onAuthenticatedEvent(event: AuthenticatedEvent): void
    {
        if(!event || !event.connection) return;

        this.completeHandshake(event.connection);

        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_AUTHENTICATED, event.connection);

        event.connection.send(new InfoRetrieveMessageComposer());
    }

    private onInitDiffieHandshakeEvent(event: InitDiffieHandshakeEvent): void
    {
        if(!event || !event.connection || !this.diffieEnabled()) return;

        try
        {
            const parser = event.getParser();
            const modulus = NitroConfiguration.getValue<string>('security.diffie.rsa.modulus', '');
            const exponent = NitroConfiguration.getValue<string>('security.diffie.rsa.exponent', '3');

            this._rsa = new LegacyRSA(modulus, exponent);

            const prime = this._rsa.verifyString(parser.encryptedPrime);
            const generator = this._rsa.verifyString(parser.encryptedGenerator);

            this._diffie = new DiffieHandshake(prime, generator);

            event.connection.send(new CompleteDiffieHandshakeMessageComposer(this._rsa.encryptString(this._diffie.publicKey)));
        }

        catch (error)
        {
            this.failDiffie(event.connection, error);
        }
    }

    private onCompleteDiffieHandshakeEvent(event: CompleteDiffieHandshakeEvent): void
    {
        if(!event || !event.connection || !this._diffie || !this._rsa) return;

        try
        {
            const parser = event.getParser();
            const serverPublicKey = this._rsa.verifyString(parser.encryptedPublicKey);
            const sharedKey = this._diffie.sharedKey(serverPublicKey);

            event.connection.setEncryption(
                new RC4Cipher(sharedKey),
                parser.serverClientEncryption ? new RC4Cipher(sharedKey) : null);

            this.tryAuthentication(event.connection);
        }

        catch (error)
        {
            this.failDiffie(event.connection, error);
        }
    }

    private failDiffie(connection: IConnection, error: unknown): void
    {
        NitroLogger.error('Diffie compatibility handshake failed', error);

        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKE_FAILED, connection);

        connection.dispose();
    }

    private diffieEnabled(): boolean
    {
        return NitroConfiguration.getValue<boolean>('security.diffie.enabled', false);
    }

    private startHandshake(connection: IConnection): void
    {
        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKING, connection);

        this._handShaking = true;
    }

    private completeHandshake(connection: IConnection): void
    {
        this.dispatchCommunicationDemoEvent(NitroCommunicationDemoEvent.CONNECTION_HANDSHAKED, connection);

        this._handShaking = false;
    }

    private startPonging(): void
    {
        this.stopPonging();

        this._pongInterval = setInterval(this.sendPong, NitroConfiguration.getValue<number>('system.pong.interval.ms', 20000));
    }

    private stopPonging(): void
    {
        if(!this._pongInterval) return;

        clearInterval(this._pongInterval);

        this._pongInterval = null;
    }

    private sendPong(connection: IConnection = null): void
    {
        connection = ((connection || this._communication.connection) || null);

        if(!connection) return;

        connection.send(new PongMessageComposer());
    }

    private dispatchCommunicationDemoEvent(type: string, connection: IConnection): void
    {
        Nitro.instance.events.dispatchEvent(new NitroCommunicationDemoEvent(type, connection));
    }

    private getSSO(): string
    {
        return NitroConfiguration.getValue('sso.ticket', null);
    }
}
