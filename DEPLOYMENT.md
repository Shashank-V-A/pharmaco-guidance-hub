# Deploy on Vercel

This project is set up to deploy the **Vite frontend** and **FastAPI backend** together on Vercel.

## What’s configured

- **Frontend:** Built with `npm run build`, output in `dist/`. Served as static files.
- **Backend:** FastAPI runs as a Vercel serverless function. All `/api/*` requests are handled by `api/index.py`, which forwards to the FastAPI app (paths like `/api/analyze` become `/analyze`).
- **API base:** In production the frontend uses `/api` as the API base (same origin). For local dev, set `VITE_API_BASE_URL=http://localhost:8000` in `.env`.

## Deploy steps

1. **Push the repo to GitHub** (if you haven’t already).

2. **Import the project in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new).
   - Import your Git repository.
   - Leave **Build Command** and **Output Directory** as in `vercel.json` (or use the defaults; Vercel will use `vercel.json`).

3. **Environment variables (Vercel project settings)**
   - `VITE_GROQ_API_KEY` or `GROQ_API_KEY` – for AI summaries (optional; fallback text if missing).
   - Do **not** set `VITE_API_BASE_URL` in production so the app uses `/api` on the same domain.

4. **Deploy**
   - Deploy from the Vercel dashboard or run `vercel` / `vc deploy` from the project root.

## Notes

- **Tesseract / drug-from-image:** The serverless environment does not include the Tesseract binary. Image/camera drug detection will return 503 (“OCR not available”). All other features (manual drug selection, VCF analysis, reports, AI explanation) work.
- **Python deps:** Vercel installs from the root `requirements.txt` for the `api/` function. The `backend/` package is used by `api/index.py`.
