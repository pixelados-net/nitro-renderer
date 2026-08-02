export interface WiredCreatorToolsRoom
{
    id: number;
    name: string;
}

export interface WiredCreatorToolsUsage
{
    wiredFurni: number;
    maxWiredFurni: number;
    effects: number;
    latestTraceEffects: number;
    maxEffects: number;
    stacks: number;
    latestTraceStacks: number;
    maxStacks: number;
    delayed: number;
    maxDelayed: number;
    variables: number;
    maxVariables: number;
    signals: number;
    maxSignals: number;
    executionMicros: number;
    compileFailures: string;
}

export interface WiredCreatorToolsEvent
{
    id: string;
    kind: string;
    occurredAt: string;
    message: string;
    stackId?: string;
}

export interface WiredCreatorToolsVariable
{
    scope: WiredCreatorToolsScopeName;
    scopeId: string;
    scopeName: string;
    name: string;
    type: string;
    intValue: string;
    stringValue: string;
    creatorName: string;
    updatedAt: string;
    revision: string;
    readOnly: boolean;
    system: boolean;
}

export interface WiredCreatorToolsEntity
{
    type: string;
    id: string;
    name: string;
}

export interface WiredCreatorToolsPermissions
{
    canInspect: boolean;
    canMutate: boolean;
    canConfigure: boolean;
}

export interface WiredCreatorToolsSettings
{
    liveUpdates: boolean;
    hideBoxes: boolean;
}

export interface WiredCreatorToolsSnapshot
{
    schemaVersion: number;
    room: WiredCreatorToolsRoom;
    revision: string;
    usage: WiredCreatorToolsUsage;
    events: WiredCreatorToolsEvent[];
    variables: WiredCreatorToolsVariable[];
    entities: WiredCreatorToolsEntity[];
    permissions: WiredCreatorToolsPermissions;
    settings: WiredCreatorToolsSettings;
}

export interface WiredCreatorToolsInspection
{
    schemaVersion: number;
    revision: string;
    entity: WiredCreatorToolsEntity;
    variables: WiredCreatorToolsVariable[];
    permissions: WiredCreatorToolsPermissions;
}

export interface WiredCreatorToolsMutationResult
{
    revision?: string;
    variable?: WiredCreatorToolsVariable;
    deleted?: boolean;
    snapshot?: WiredCreatorToolsSnapshot;
}

export type WiredCreatorToolsDocument = Record<string, unknown>;

export function parseWiredCreatorToolsDocument<T = WiredCreatorToolsDocument>(document: string): T
{
    if(!document) return null;

    try
    {
        const parsed = JSON.parse(document);

        if(!parsed || (typeof parsed !== 'object') || Array.isArray(parsed)) return null;

        return parsed as T;
    }
    catch
    {
        return null;
    }
}

export function isWiredCreatorToolsSnapshot(value: unknown): value is WiredCreatorToolsSnapshot
{
    if(!isDocument(value)) return false;

    return (typeof value.schemaVersion === 'number') && isDocument(value.room) && (typeof value.room.id === 'number') &&
        (typeof value.room.name === 'string') && (typeof value.revision === 'string') && isDocument(value.usage) &&
        Array.isArray(value.events) && Array.isArray(value.variables) && Array.isArray(value.entities) &&
        isDocument(value.permissions) && isDocument(value.settings);
}

export function isWiredCreatorToolsInspection(value: unknown): value is WiredCreatorToolsInspection
{
    if(!isDocument(value)) return false;

    return (typeof value.schemaVersion === 'number') && (typeof value.revision === 'string') && isDocument(value.entity) && Array.isArray(value.variables) && isDocument(value.permissions);
}

function isDocument(value: unknown): value is WiredCreatorToolsDocument
{
    return !!value && (typeof value === 'object') && !Array.isArray(value);
}
export enum WiredCreatorToolsScope
{
    Furni = 1,
    User = 2,
    Room = 3,
    Reference = 4
}

export type WiredCreatorToolsScopeName = 'context' | 'furni' | 'user' | 'room' | 'reference';
