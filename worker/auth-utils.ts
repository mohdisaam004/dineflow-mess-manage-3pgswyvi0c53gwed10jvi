import type { Env } from './app-env';

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

export function requireAuthConfig(env: Env): { jwtSecret: string; superAdminPassword: string } {
  const jwtSecret = env.JWT_SECRET?.trim();
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD?.trim();
  if (!jwtSecret) {
    throw new AuthConfigError('JWT_SECRET is not configured. Set it in .dev.vars or Cloudflare secrets.');
  }
  if (!superAdminPassword) {
    throw new AuthConfigError('SUPER_ADMIN_PASSWORD is not configured. Set it in .dev.vars or Cloudflare secrets.');
  }
  return { jwtSecret, superAdminPassword };
}

export type AuthRole = 'member' | 'admin' | 'super_admin';

export type AuthPayload = {
  sub: string;
  role: AuthRole;
  name: string;
  memberId?: string;
  exp: number;
  iat: number;
};

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_PREFIX = 'pbkdf2:';

async function legacySha256Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `${HASH_PREFIX}${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(HASH_PREFIX)) {
    const [, iterationsStr, saltHex, hashHex] = storedHash.split(':');
    const iterations = Number(iterationsStr);
    const salt = fromHex(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return toHex(new Uint8Array(derived)) === hashHex;
  }
  const legacyHash = await legacySha256Hash(password);
  return legacyHash === storedHash;
}

function base64UrlEncode(data: Uint8Array): string {
  const str = btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>, secret: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyToken(token: string, secret: string): Promise<AuthPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await getSigningKey(secret);
  const signature = base64UrlDecode(encodedSignature);
  const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(signingInput));
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as AuthPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashSuperAdminPassword(env: Env): Promise<string> {
  const { superAdminPassword } = requireAuthConfig(env);
  return hashPassword(superAdminPassword);
}
