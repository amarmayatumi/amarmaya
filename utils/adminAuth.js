import crypto from 'crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function verifyAdminPassword(password) {
  const expected = getRequiredEnv('ADMIN_PASSWORD');
  if (typeof password !== 'string' || password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export function createAdminToken() {
  const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(16).toString('hex'),
  });
  const encoded = base64url(payload);
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyAdminToken(token) {
  try {
    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
    if (typeof token !== 'string') return false;
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return false;

    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
