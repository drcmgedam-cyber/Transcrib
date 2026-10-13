import { timingSafeEqual } from 'node:crypto';

export function authorized(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  const provided = String(req.headers['x-app-password'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireAccess(req, res) {
  if (authorized(req)) return true;
  res.status(401).json({ error: 'Enter the app password to continue.' });
  return false;
}
