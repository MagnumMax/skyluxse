declare module '@zohocrm/nodejs-sdk-7.0' {
    export class UserSignature {
        constructor(email: string);
        getEmail(): string;
    }

    export class Token {
    }

    export class OAuthToken extends Token {
        constructor(clientId: string, clientSecret: string, token: string, type: TokenType, redirectURL?: string);
        setAccessToken(accessToken: string): void;
        setRefreshToken(refreshToken: string): void;
        setExpiresIn(expiresIn: string): void;
        setId(id: string): void;
        getClientId(): string;
        getRefreshToken(): string;
        getAccessToken(): string;
        getGrantToken(): string;
        getExpiresIn(): string;
        getUserSignature(): UserSignature;
    }

    export class OAuthBuilder {
        clientId(clientId: string): OAuthBuilder;
        clientSecret(clientSecret: string): OAuthBuilder;
        refreshToken(refreshToken: string | undefined): OAuthBuilder;
        redirectURL(redirectURL: string): OAuthBuilder;
        accessToken(accessToken: string): OAuthBuilder;
        build(): OAuthToken;
    }

    export class LogBuilder {
        level(level: Levels): LogBuilder;
        filePath(filePath: string): LogBuilder;
        build(): any;
    }

    export enum Levels {
        INFO,
        DEBUG,
        ERROR,
        WARNING
    }

    export class InitializeBuilder {
        constructor(environment: Environment, token: Token, store: TokenStore);
        logger(logger: any): InitializeBuilder;
        build(): Promise<void>;
    }

    export namespace TokenStore {
        export class TokenStore {
            getToken(user: UserSignature, token: Token): Promise<Token | undefined>;
            saveToken(user: UserSignature, token: Token): Promise<void>;
            deleteToken(token: Token): Promise<void>;
            getTokens(tokens: Token[]): Promise<Token[]>;
            deleteTokens(tokens: Token[]): Promise<void>;
            findToken(token: Token): Promise<Token | undefined>;
            findTokens(tokens: Token[]): Promise<Token[]>;
        }
    }

    export class Environment {
    }

    export class USDataCenter {
        static PRODUCTION: Environment;
        static SANDBOX: Environment;
    }

    export class EUDataCenter {
        static PRODUCTION: Environment;
        static SANDBOX: Environment;
    }

    export class FileStore implements TokenStore {
        constructor(filePath: string);
        getToken(user: UserSignature, token: Token): Promise<Token | undefined>;
        saveToken(user: UserSignature, token: Token): Promise<void>;
        deleteToken(token: Token): Promise<void>;
        getTokens(tokens: Token[]): Promise<Token[]>;
        deleteTokens(tokens: Token[]): Promise<void>;
        findToken(token: Token): Promise<Token | undefined>;
        findTokens(tokens: Token[]): Promise<Token[]>;
    }

    export namespace Record {
        export class Record {
            addFieldValue(field: any, value: any): void;
            setId(id: string): void;
        }
        export class CreateRecords {
            constructor(moduleAPIName: string);
            addRecord(record: Record): void;
            create(): Promise<any>;
        }
        export namespace Field {
            export namespace Contacts {
                export const FIRST_NAME: any;
                export const LAST_NAME: any;
                export const EMAIL: any;
                export const PHONE: any;
            }
            export namespace Sales_Orders {
                export const SUBJECT: any;
                export const CONTACT_NAME: any;
            }
        }
    }

    export enum TokenType {
        GRANT,
        REFRESH
    }
}
