import BaseModule from './base_module.js';
import type { SecretHandler, SecretMethod, SecretMapping, SecretType, SecretValue } from '../types.js';

/**
 * ScalewaySecrets is a utility for parsing and mapping Scaleway Secrets JSON into
 * environment variables at runtime.
 *
 * Instantiate with an Env-like "set" function (e.g. AdonisJS `env.set.bind(env)`)
 * so that variables can be injected dynamically.
 *
 * Example:
 * ```ts
 * const secrets = new ScalewaySecrets(env.set.bind(env));
 * ```
 */
export class ScalewaySecrets extends BaseModule {
    /**
     * Holds all secrets parsed from Scaleway Secrets.
     */
    private secrets: Record<string, any> = {};

    /**
     * Prepare a handler for a "database_credentials" secret.
     *
     * Use this when your secret JSON contains database connection fields:
     * `{ engine, host, port, username, password, dbname }`.
     * You can override the default ENV variable names by passing a mapping.
     *
     * Example:
     * ```ts
     * // Default maps: engine->DB_CONNECTION, host->DB_HOST, etc.
     * const handleDb = secrets.database({ host: 'MY_DB_HOST', username: 'MY_DB_USER' });
     * // Later, when you retrieve the raw JSON string:
     * handleDb('SCW_DB_SECRET', rawJsonString);
     * ```
     *
     * @param mapping  Optional override of secret field → ENV variable names
     * @returns A function(key: string, rawJson: string) that parses and applies the mappings
     */
    public database: SecretMethod<Partial<Record<keyof SecretValue<'database_credentials'>, string>>> =
        this.makeSecretMethod<'database_credentials', Partial<Record<keyof SecretValue<'database_credentials'>, string>>>(
            mapping => ({
                type: 'database_credentials',
                envMapping: {
                    engine: 'DB_CONNECTION',
                    host: 'DB_HOST',
                    port: 'DB_PORT',
                    username: 'DB_USER',
                    password: 'DB_PASSWORD',
                    dbname: 'DB_DATABASE',
                    ...mapping,
                },
            })
        );

    /**
     * Prepare a handler for a "basic_credentials" secret containing `{ username, password }`.
     *
     * Pass in a mapping for how each field should be set as ENV vars.
     *
     * Example:
     * ```ts
     * const handleCreds = secrets.credentials({
     *   username: 'API_USER',
     *   password: 'API_PASS',
     * });
     * handleCreds('SCW_CREDS_SECRET', rawJsonString);
     * ```
     *
     * @param mapping  Secret field → ENV variable name mapping
     * @returns A function(key: string, rawJson: string) that parses and applies the mappings
     */
    public credentials: SecretMethod<Partial<Record<keyof SecretValue<'basic_credentials'>, string>>> =
        this.makeSecretMethod<'basic_credentials', Partial<Record<keyof SecretValue<'basic_credentials'>, string>>>(
            mapping => ({
                type: 'basic_credentials',
                envMapping: {
                    username: 'USERNAME',
                    password: 'PASSWORD',
                    ...mapping,
                },
            })
        );

    /**
     * Prepare a handler for a "key_value" secret containing arbitrary string pairs.
     *
     * Provide a mapping of each secret key to its desired ENV variable name.
     *
     * Example:
     * ```ts
     * const handleKv = secrets.kv({ api_key: 'SERVICE_API_KEY', mode: 'SERVICE_MODE' });
     * handleKv('SCW_KV_SECRET', rawJsonString);
     * ```
     *
     * @param mapping  Secret key → ENV variable name mapping
     * @returns A function(key: string, rawJson?: string) that parses and applies the mappings
     */
    public kv: SecretMethod<Record<string, string>> =
        this.makeSecretMethod<'key_value', Record<string, string>>(
            mapping => ({
                type: 'key_value',
                envMapping: mapping,
            })
        );

    /**
     * Prepare a handler for a "ssh_key" secret containing `{ ssh_private_key }`.
     *
     * Supply a mapping from the `ssh_private_key` field to the target ENV var name.
     *
     * Example:
     * ```ts
     * const handleSsh = secrets.ssh({ ssh_private_key: 'SSH_KEY_ENV' });
     * handleSsh('SCW_SSH_SECRET', rawJsonString);
     * ```
     *
     * @param mapping  Secret field → ENV variable name mapping
     * @returns A function(key: string, rawJson?: string) that parses and applies the mapping
     */
    public ssh: SecretMethod<Partial<Record<keyof SecretValue<'ssh_key'>, string>>> =
        this.makeSecretMethod<'ssh_key', Partial<Record<keyof SecretValue<'ssh_key'>, string>>>(
            mapping => ({
                type: 'ssh_key',
                envMapping: mapping,
            })
        );

    /**
     * Maps values from a decoded secret object to environment variables based on a provided mapping.
     *
     * @template T  The secret type.
     * @param secretValue  The decoded secret object.
     * @param mapping  Object defining how secret keys map to environment variable names.
     * @private
     */
    private mapSecret<T extends SecretType>(secretValue: SecretValue<T>, mapping: SecretMapping<T>): void {
        // Verify that the secret object matches the expected structure
        if (!this.verify(secretValue, mapping.type)) {
            throw new TypeError(
                `Invalid secret for type '${ mapping.type }', missing or wrong-typed fields.`,
            );
        }

        // Iterate over each mapping from secret key to environment variable name
        for (const [key, envVar] of Object.entries(mapping.envMapping) as [keyof SecretValue<T>, string][]) {
            // Ensure the secret actually has this key
            if (!Object.prototype.hasOwnProperty.call(secretValue, key)) {
                throw new TypeError(
                    `Secret key '${ String(key) }' not found for type '${ mapping.type }'. ` +
                    `Cannot map to environment variable '${ envVar }'.`,
                );
            }

            const value = secretValue[key];
            // Reject undefined or null values explicitly
            if (value === undefined || value === null) {
                throw new TypeError(
                    `Secret property '${ String(key) }' is ${ value } for type '${ mapping.type }'. ` +
                    `Cannot map to environment variable '${ envVar }'.`,
                );
            }

            this.set(envVar, value as any);
        }
    }

    /**
     * Verifies that a provided JSON value matches the expected secret structure.
     *
     * @template T  The secret type to verify against.
     * @param secretValue  The value (typically parsed JSON) to validate.
     * @param type  The expected secret type name.
     * @returns True if the value conforms to SecretValue<T>, false otherwise.
     * @private
     */
    private verify<T extends SecretType>(secretValue: unknown, type: T): secretValue is SecretValue<T> {
        if (typeof secretValue !== 'object' || secretValue === null) {
            return false;
        }

        const obj = secretValue as Record<string, unknown>;
        switch (type) {
            case 'basic_credentials':
                return (
                    typeof obj.username === 'string' &&
                    typeof obj.password === 'string'
                );
            case 'database_credentials':
                return (
                    typeof obj.engine === 'string' &&
                    typeof obj.username === 'string' &&
                    typeof obj.password === 'string' &&
                    typeof obj.host === 'string' &&
                    typeof obj.dbname === 'string' &&
                    typeof obj.port === 'string'
                );
            case 'key_value':
                return Object.values(obj).every((v) => typeof v === 'string');
            case 'ssh_key':
                return typeof obj.ssh_private_key === 'string';
            default:
                return false;
        }
    }

    /**
     * Parses a raw JSON string and returns the parsed object.
     *
     * @param name {string} - The name of the secret for error reporting.
     * @param rawJson {string} - The raw JSON string to parse.
     * @returns The parsed object.
     * @throws TypeError if the JSON is invalid.
     * @private
     */
    private parseJson(name: string, rawJson?: string): unknown {
        if (!rawJson) {
            throw new TypeError(`No JSON provided for secret '${ name }'`);
        }
        // Trim whitespace and strip surrounding quotes if present
        let jsonString = rawJson.trim().replaceAll(/\\/g, '');
        if (
            (jsonString.startsWith('"') && jsonString.endsWith('"')) ||
            (jsonString.startsWith("'") && jsonString.endsWith("'"))
        ) {
            jsonString = jsonString.slice(1, -1);
        }
        try {
            return JSON.parse(jsonString);
        }
        catch (err: any) {
            throw new TypeError(
                `Unable to parse JSON secret from '${ name }': ${ err.message || err }`
            );
        }
    }

    /**
     * Factory for generating both a standard and optional SecretHandler from a mapping definition.
     *
     * @param mappingFactory  Function that given mapping overrides returns a full SecretMapping.
     * @returns A SecretMethod which creates SecretHandlers and exposes .optional variant.
     * @private
     */
    private makeSecretMethod<T extends SecretType, M>(mappingFactory: (mapping: M) => SecretMapping<T>): SecretMethod<M> {
        const method = ((mapping: M = {} as M) => this.createHandler(mappingFactory(mapping))) as SecretMethod<M>;
        method.optional = ((mapping: M = {} as M) => method(mapping).optional) as (mapping?: M) => (key: string, rawJson?: string) => void;
        return method;
    }

    /**
     * Internal factory for creating both a standard and optional SecretHandler
     * from a mapping definition.
     *
     * @param mapping  Definition of secret type and its ENV-key mapping.
     * @returns A SecretHandler with an `.optional()` variant to skip missing JSON values.
     * @private
     */
    private createHandler<T extends SecretType>(mapping: SecretMapping<T>): SecretHandler {
        const handler = ((name: string, rawJson: string) => {
            const parsed = this.parseJson(name, rawJson);
            this.secrets[name] = parsed;
            this.mapSecret(parsed as SecretValue<T>, mapping);
        }) as SecretHandler;

        handler.optional = (name: string, rawJson?: string) => {
            if (!rawJson) return;

            const parsed = this.parseJson(name, rawJson);
            this.secrets[name] = parsed;
            this.mapSecret(parsed as SecretValue<T>, mapping);
        };

        return handler;
    }
}

