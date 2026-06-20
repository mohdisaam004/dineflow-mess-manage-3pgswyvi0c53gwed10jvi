import type { Env as CoreEnv } from './core-utils';

export type Env = CoreEnv & {
  JWT_SECRET?: string;
  SUPER_ADMIN_PASSWORD?: string;
};
