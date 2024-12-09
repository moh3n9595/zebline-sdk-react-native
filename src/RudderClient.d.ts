import { Configuration } from './NativeBridge';
import IRudderContext from './IRudderContext';
declare function setup(writeKey: string, configuration?: Configuration, options?: Record<string, unknown> | null): Promise<void>;
declare function track(event: string, properties?: Record<string, unknown> | null, options?: Record<string, unknown> | null): Promise<void>;
declare function screen(name: string, properties?: Record<string, unknown> | null, options?: Record<string, unknown> | null): Promise<void>;
declare function identify(userId: string, traits: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
declare function identify(traits: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
declare function group(groupId: string, traits?: Record<string, unknown> | null, options?: Record<string, unknown> | null): Promise<void>;
declare function alias(newId: string, options?: Record<string, unknown> | null): Promise<void>;
/**
 * @deprecated use alias{@link alias(newId: string, options?: Record<string, unknown> | null)} instead
 */
declare function alias(previousId: string, userId: string | Record<string, unknown>): Promise<void>;
declare function putDeviceToken(token: string): Promise<void>;
/**
 * @deprecated use putDeviceToken{@link putDeviceToken(token: string)} instead
 */
declare function putDeviceToken(androidToken: string, iOSToken: string): Promise<void>;
/**
 * @deprecated use putAdvertisingId{@link putAdvertisingId(advertisingId: string)} instead
 */
declare function setAdvertisingId(androidId: string, iOSId: string): Promise<void>;
declare function putAdvertisingId(advertisingId: string): Promise<void>;
declare function clearAdvertisingId(): Promise<void>;
/**
 * @deprecated use putAnonymousId{@link putAnonymousId(anonymousId: string)} instead
 */
declare function setAnonymousId(anonymousId: string): Promise<void>;
declare function putAnonymousId(anonymousId: string): Promise<void>;
declare function reset(clearAnonymousId?: boolean): Promise<void>;
declare function flush(): Promise<void>;
declare function optOut(optOut: boolean): Promise<void>;
declare function registerCallback(name: string, callback: Function): Promise<void>;
declare function getRudderContext(): Promise<IRudderContext | null>;
declare function startSession(sessionId?: number): Promise<void>;
declare function endSession(): Promise<void>;
declare function getSessionId(): Promise<number | null>;
declare const rudderClient: {
    setup: typeof setup;
    track: typeof track;
    screen: typeof screen;
    identify: typeof identify;
    group: typeof group;
    alias: typeof alias;
    reset: typeof reset;
    flush: typeof flush;
    optOut: typeof optOut;
    putDeviceToken: typeof putDeviceToken;
    putAdvertisingId: typeof putAdvertisingId;
    setAdvertisingId: typeof setAdvertisingId;
    clearAdvertisingId: typeof clearAdvertisingId;
    putAnonymousId: typeof putAnonymousId;
    setAnonymousId: typeof setAnonymousId;
    registerCallback: typeof registerCallback;
    getRudderContext: typeof getRudderContext;
    startSession: typeof startSession;
    endSession: typeof endSession;
    getSessionId: typeof getSessionId;
};
export default rudderClient;
