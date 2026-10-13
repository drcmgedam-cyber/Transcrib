import { Supadata } from '@supadata/js';
import { requireAccess } from '../lib/auth.js';

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function plainText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join(' ').trim();
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for this request.' });
  if (!requireAccess(req, res)) return;
  const url = String(req.body?.url || '').trim();
  if (!isYouTubeUrl(url)) return res.status(400).json({ error: 'Enter a valid YouTube video URL.' });
  if (!process.env.SUPADATA_API_KEY) return res.status(503).json({ error: 'Transcript retrieval is not configured yet. Add SUPADATA_API_KEY in your hosting settings.' });

  try {
    const supadata = new Supadata({ apiKey: process.env.SUPADATA_API_KEY });
    // Prefer English captions when the video provides them.
    const result = await supadata.transcript({ url, text: true, mode: 'auto', lang: 'en' });
    if ('jobId' in result) return res.status(202).json({ jobId: result.jobId, status: 'processing' });
    const transcript = plainText(result.content);
    if (!transcript) return res.status(422).json({ error: 'The transcript provider returned no readable transcript for this video.' });
    return res.status(200).json({ transcript, language: result.lang || null, sourceUrl: url });
  } catch (error) {
    const providerMessage = error?.message || 'Transcript lookup failed.';
    return res.status(502).json({ error: providerMessage });
  }
}
