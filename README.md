# Framewise

Framewise turns a public YouTube video or a pasted transcript into a transcript, AI summary, key takeaways, practical learnings, a mind map, and an infographic poster. Notes are kept in the user's browser storage; no user accounts or database are required for this personal MVP.

## What you need

- A [Vercel account](https://vercel.com) to host the website.
- A [Gemini API key](https://aistudio.google.com/api-keys) for note generation.
- A [Supadata API key](https://dash.supadata.ai) for public YouTube transcript retrieval. Its current free tier and pricing can change; check the provider dashboard before relying on it.
- Node.js 20 or newer if you want to run the app locally first.

Keep both provider keys in Vercel's server-side environment variables. Do not put them into `app.js` or any browser-facing file.

## Run locally

1. Install Node.js 20+ and the Vercel CLI (`npm install -g vercel`).
2. Open a terminal in this folder and run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY`, `SUPADATA_API_KEY`, and a private `APP_PASSWORD`.
4. Run `vercel dev` and open the local URL it prints.
5. Enter the app password, paste a public YouTube URL, and choose **Get my notes**. Or paste transcript text and choose **Create notes**.

## Deploy as a hosted website

1. Create accounts at Vercel, OpenAI, and Supadata.
2. In Google AI Studio, create a Gemini API key. In Supadata, create an API key.
3. Put this `framewise-app` folder in a private GitHub repository. Do not commit `.env.local` or any API keys.
4. In Vercel, choose **Add New → Project**, import that repository, and leave the build settings at their defaults.
5. In the Vercel project settings, add these environment variables for **Production** (and Preview if needed):
   - `GEMINI_API_KEY` — your Gemini API key
   - `SUPADATA_API_KEY` — your Supadata API key
   - `APP_PASSWORD` — a long password for your personal site
   - `GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`. Set `gemini-3.1-pro-preview` if you specifically want the Gemini Pro preview model and your API project has access.
6. Deploy. After deployment, open the Vercel URL, enter `APP_PASSWORD`, and analyze a public YouTube video with captions.
7. Whenever you change the environment variables, redeploy so they apply to the live deployment.

Vercel serves `index.html` as the website and each file in `api/` as a Node.js Function. The included `vercel.json` sets a 60-second maximum function duration for transcript and summary requests.

## Use

- **YouTube URL:** Framewise asks Supadata for a public video's transcript. If transcript processing is asynchronous, the app polls until the text is ready, then requests structured notes from OpenAI.
- **Pasted transcript:** skips transcript retrieval and sends the text to OpenAI for notes.
- **Library:** entries and transcripts are saved in browser local storage. They stay in that browser and are not synced to another device. Saving/transcribing in an incognito session or clearing site data removes those local entries.
- **Copy and export:** copy the notes, download a `.txt` file, or switch to Mind map/Infographic and download an SVG poster.
- **Password:** `APP_PASSWORD` enables a simple shared-password gate. This is suitable for a personal prototype; it is not per-user sign-in or a multi-user account system.

## Limits

- A video must be public and accessible to the transcript provider; private, age-restricted, members-only, and some region-restricted videos may fail.
- Transcript retrieval and AI generation use third-party APIs and may incur charges or monthly limits. Review each provider's current terms and pricing.
- Browser storage is local to one browser/device. This MVP has no cloud-synced user accounts, channel monitoring, or shared library.
- The official YouTube captions download API requires edit permission for the video, so this app uses Supadata for public video transcripts instead.

## Project files

- `index.html`, `styles.css`, `app.js` — responsive browser app
- `api/transcript.js`, `api/transcript-status.js` — server-side transcript retrieval
- `api/summarize.js` — server-side structured Gemini AI notes
- `api/auth.js`, `api/_auth.js`, `api/health.js` — password gate and configuration status
