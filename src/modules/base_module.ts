export default class BaseModule {
    /**
     * Reference to the environment variables
     * @param key {string} - The environment variable key
     * @param value {any} - The environment variable value
     */
    protected set(key: string, value: any) {
        process.env[key] = value;
    }

    /**
     * Check if an environment variable exists within the current module
     * @param key {string} - The environment variable key to check
     * @returns {boolean} - Returns true if the environment variable exists, false otherwise
     */
    public exists(key: string): boolean {
        return process.env[key] !== undefined;
    }
}