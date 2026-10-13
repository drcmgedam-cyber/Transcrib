export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ready: Boolean(process.env.GEMINI_API_KEY && process.env.SUPADATA_API_KEY),
    passwordRequired: Boolean(process.env.APP_PASSWORD),
  });
}
