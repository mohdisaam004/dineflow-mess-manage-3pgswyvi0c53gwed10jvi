import type { Context, Next } from 'hono';
import type { Env } from './app-env';
import { AuthConfigError, requireAuthConfig, verifyToken, type AuthPayload, type AuthRole } from './auth-utils';

export type AuthContext = {
  auth: AuthPayload;
};

const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/bootstrap',
  '/api/health',
  '/api/client-errors',
]);

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) {
  if (!c.req.path.startsWith('/api/') || isPublicPath(c.req.path)) {
    return next();
  }

  try {
    const { jwtSecret } = requireAuthConfig(c.env);
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, jwtSecret);
    if (!payload) {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }
    c.set('auth', payload);
    return next();
  } catch (err) {
    if (err instanceof AuthConfigError) {
      return c.json({ success: false, error: err.message }, 503);
    }
    throw err;
  }
}

export function requireRoles(...roles: AuthRole[]) {
  return async (c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) => {
    const auth = c.get('auth');
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    return next();
  };
}

export function requireAdmin(c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) {
  return requireRoles('admin', 'super_admin')(c, next);
}

export function requireSuperAdmin(c: Context<{ Bindings: Env; Variables: AuthContext }>, next: Next) {
  return requireRoles('super_admin')(c, next);
}

export function getAuth(c: Context<{ Bindings: Env; Variables: AuthContext }>): AuthPayload {
  return c.get('auth');
}

export function stripSensitiveSettings<T extends { superAdminPasswordHash?: string; memberAccessPinHash?: string }>(
  settings: T
): Omit<T, 'superAdminPasswordHash' | 'memberAccessPinHash'> {
  const { superAdminPasswordHash: _, memberAccessPinHash: __, ...safe } = settings;
  return safe;
}
