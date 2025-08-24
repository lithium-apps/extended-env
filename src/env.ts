import { Env as CoreEnv, EnvProcessor } from '@adonisjs/core/env';
import { ScalewaySecrets } from './modules/scaleway_secrets.js';

import type { ValidateFn } from '@poppinss/validator-lite/types'


export class Env<EnvValues extends Record<string, any>> extends CoreEnv<EnvValues> {
    public static readonly scaleway = new ScalewaySecrets();

    /**
     * Create an instance of the env class by validating the
     * environment variables. Also, the `.env` files are
     * loaded from the appRoot
     */
    static async create<Schema extends { [key: string]: ValidateFn<unknown> }>(appRoot: URL, schema: Schema): Promise<Env<{ [K in keyof Schema]: ReturnType<Schema[K]> }>> {
        const values = await new EnvProcessor(appRoot).process();
        const validator = this.rules(schema);
        return new Env(validator.validate(values));
    }
}
