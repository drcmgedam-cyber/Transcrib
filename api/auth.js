import { requireAccess } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for this request.' });
  if (!requireAccess(req, res)) return;
  return res.status(200).json({ ok: true });
}
