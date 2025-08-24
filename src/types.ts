export type BasicCredentials = {
    username: string
    password: string
}

export type DatabaseCredentials = {
    engine: string
    username: string
    password: string
    host: string
    dbname: string
    port: string
}

export type KeyValue = Record<string, string>

export type SSHKey = {
    ssh_private_key: string
}
export type SecretType = 'basic_credentials' | 'database_credentials' | 'key_value' | 'ssh_key'

export type SecretValue<T extends SecretType> = T extends 'basic_credentials'
    ? BasicCredentials
    : T extends 'database_credentials'
        ? DatabaseCredentials
        : T extends 'key_value'
            ? KeyValue
            : T extends 'ssh_key'
                ? SSHKey
                : never

export type SecretMapping<T extends SecretType> = {
    type: T
    envMapping: {
        [K in keyof SecretValue<T>]?: string
    }
}

/**
 * SecretHandler represents a callable that maps a raw JSON secret into environment variables,
 * and also exposes an 'optional' variant to skip mapping when no value is provided.
 */
export interface SecretHandler {
    /**
     * Parse and map the provided JSON secret string into environment variables.
     * @param key     The identifier or name of the secret (for error messages).
     * @param rawJson The raw JSON string containing the secret.
     */
    (key: string, rawJson?: string): void;

    /**
     * Parse and map the provided JSON secret string into environment variables, but skip
     * the mapping if no JSON is provided.
     * @param key     The identifier or name of the secret (for error messages).
     * @param rawJson The raw JSON string containing the secret, or undefined to skip mapping.
     */
    optional(key: string, rawJson?: string): void;
}

/**
 * A factory function that, given an optional mapping config, produces a SecretHandler,
 * and also exposes an '.optional()' variant for skipping missing secrets.
 */
export interface SecretMethod<M> {
    /**
     * Create a handler that will parse and map the secret JSON according to the mapping.
     * @param mapping  Optional mapping of secret fields to ENV variable names.
     */
    (mapping?: M): SecretHandler;

    /**
     * Create a handler that skips mapping when no JSON is provided.
     * @param mapping  Optional mapping of secret fields to ENV variable names.
     */
    optional(mapping?: M): SecretHandler['optional'];
}
