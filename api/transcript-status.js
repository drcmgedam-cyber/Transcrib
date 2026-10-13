import { Supadata } from '@supadata/js';
import { requireAccess } from '../lib/auth.js';

function plainText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join(' ').trim();
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for this request.' });
  if (!requireAccess(req, res)) return;
  const jobId = String(req.query?.jobId || '').trim();
  if (!jobId || jobId.length > 160) return res.status(400).json({ error: 'A valid transcript job ID is required.' });
  if (!process.env.SUPADATA_API_KEY) return res.status(503).json({ error: 'Transcript retrieval is not configured.' });

  try {
    const supadata = new Supadata({ apiKey: process.env.SUPADATA_API_KEY });
    const job = await supadata.transcript.getJobStatus(jobId);
    if (job.status === 'failed') return res.status(422).json({ error: job.error?.message || 'Transcript processing failed.' });
    if (job.status !== 'completed') return res.status(200).json({ status: job.status || 'processing' });
    const transcript = plainText(job.result?.content ?? job.result);
    if (!transcript) return res.status(422).json({ error: 'The transcript job completed without readable text.' });
    return res.status(200).json({ status: 'completed', transcript, language: job.result?.lang || null });
  } catch (error) {
    return res.status(502).json({ error: error?.message || 'Could not check transcript status.' });
  }
}
