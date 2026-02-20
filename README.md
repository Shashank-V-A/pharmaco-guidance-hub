# GeneX — Precision Drug Safety Through Genomics

AI-assisted pharmacogenomic clinical decision support powered by deterministic CPIC guidelines.

---

## Live demo

**[Add your live demo link here]**  
Example: `https://pharmaco-guidance-hub.vercel.app`

---

## LinkedIn video

**[Add your LinkedIn video link here]**  
Example: `https://www.linkedin.com/posts/...`

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vite + React)                    │
│  • Analysis page: VCF upload, drug selection, image/camera       │
│  • Results page: Risk, profile, confidence, audit, PDF report    │
│  • Auth: Google OAuth (optional)                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP /api/*
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI on Vercel)                    │
│  • POST /api/analyze     — VCF + drug → CPIC rules + LLM         │
│  • POST /api/detect-drug — Image → OCR → drug name (optional)    │
│  • GET  /api/report/:id  — PDF clinical report                   │
│  • GET  /api/health      — Health check                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ VCF parser    │    │ Phenotype +      │    │ LLM (Groq)      │
│ (cyvcf2 /     │    │ CPIC rule engine │    │ explanation only │
│  pure-Python) │    │ (deterministic)  │    │ (no risk logic)  │
└───────────────┘    └──────────────────┘    └─────────────────┘
```

- **Strict separation:** Risk and recommendations come only from the CPIC rule engine. The LLM provides explanations only.
- **Scope:** 6 genes (CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD), 6 drugs (CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL).

---

## Tech stack

| Layer      | Technologies |
|-----------|--------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Recharts |
| Backend   | FastAPI, Pydantic, Uvicorn |
| API host  | Vercel (serverless); `/api/*` → Python function |
| VCF       | cyvcf2 (optional) or pure-Python parser |
| OCR       | Tesseract + pytesseract + Pillow (image drug detection; not available on Vercel serverless) |
| LLM       | Groq API (optional; fallback text if missing) |
| PDF       | ReportLab (clinical report download) |

---

## Installation instructions

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+ (for local backend)
- **Tesseract** (optional; only for local image/camera drug detection)

### 1. Clone and install frontend

```bash
git clone <YOUR_GIT_URL>
cd pharmaco-guidance-hub
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and set:

| Variable              | Description |
|-----------------------|-------------|
| `VITE_API_BASE_URL`   | Backend URL. Local: `http://localhost:8000`. Production (Vercel): leave unset to use `/api`. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID (for sign-in). Create at [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |
| `VITE_GROQ_API_KEY`   | Groq API key for AI summaries (optional; [console.groq.com](https://console.groq.com)). |

### 3. Run backend locally (optional)

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Set `VITE_API_BASE_URL=http://localhost:8000` in `.env` so the frontend uses this backend.

### 4. Run frontend

```bash
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints). For Google sign-in, add `http://localhost:5173` to authorized JavaScript origins in Google Cloud.

### 5. Deploy to Vercel

- Import the repo at [vercel.com/new](https://vercel.com/new).
- Add env vars: `VITE_GROQ_API_KEY` (optional). Do **not** set `VITE_API_BASE_URL` so the app uses `/api` on the same domain.
- Deploy. Frontend and API are served from one Vercel project.

---

## API documentation

Base URL: same origin `/api` (e.g. `https://your-app.vercel.app/api`) or `http://localhost:8000` when running backend locally.

### POST `/api/analyze`

Run pharmacogenomic analysis from a VCF and drug.

**Request:** `multipart/form-data`

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `file`             | File   | Yes      | VCF or VCF.gz (max 5MB). |
| `drug_name`        | string | Yes      | One of: CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL. |
| `patient_id`       | string | No       | If omitted, a UUID is generated. |
| `explanation_mode` | string | No       | `clinician` (default) or `research`. Affects LLM explanation style only. |

**Success (200):** JSON with `patient_id`, `drug`, `timestamp`, `risk_assessment`, `pharmacogenomic_profile`, `clinical_recommendation`, `llm_generated_explanation`, `quality_metrics`, optional `audit_trail`.

**Errors:**

- **400** — VCF parsing failed (invalid file, wrong type, or over size).
- **422** — Rule engine failed (unsupported drug, gene not detected, phenotype not determined).

---

### POST `/api/detect-drug`

Detect drug name from an image (label photo). Input enhancement only; does not run CPIC.

**Request:** `multipart/form-data`

| Field  | Type | Required | Description |
|--------|------|----------|-------------|
| `image` | File | Yes | Image (jpg, png, webp, bmp, gif; max 10MB). |

**Success (200):** `{ "detected_drug": "WARFARIN", "confidence": 0.92, "raw_text": "..." }`

**Errors:**

- **400** — Invalid or oversized image.
- **422** — No supported drug name found in image.
- **503** — OCR not available (e.g. on Vercel serverless; use manual drug selection).

---

### GET `/api/report/{patient_id}`

Download PDF clinical report for the last successful analysis for `patient_id`.

**Success (200):** PDF file.

**404** — No report found for that patient.

---

### GET `/api/health`

Health check.

**Success (200):** `{ "status": "ok" }`

---

## Usage examples

### Analyze with cURL

```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@sample.vcf" \
  -F "drug_name=WARFARIN" \
  -F "patient_id=patient-001"
```

### Detect drug from image (when Tesseract is available)

```bash
curl -X POST http://localhost:8000/detect-drug \
  -F "image=@label.jpg"
```

### Download report

```bash
curl -O -J "http://localhost:8000/report/patient-001"
```

### Frontend flow

1. **Analysis:** Upload VCF, choose drug (manual or, if available, from image/camera), select explanation mode (Clinician / Research), click **Analyze**.
2. **Results:** View risk, phenotype, confidence, audit trail; download clinical report (PDF) or JSON; expand AI summary and developer view.

---

## Team members

**[Add your team members here.]**

Example:

- **Name 1** — Role (e.g. Frontend, Backend)
- **Name 2** — Role
- **Name 3** — Role
