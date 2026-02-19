# Pharmacogenomics Backend (FastAPI)

Hackathon-compliant API: CPIC rule engine, 6 genes, 6 drugs. LLM (Grok) for explanation only.

## Scope

- **Genes:** CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD
- **Drugs:** CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL

## Run

From **project root** (parent of `backend/`):

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Optional env:

- `GROK_API_KEY` – Grok API key for LLM explanations (fallback text if missing)

## Test

From project root:

```bash
python -m pytest backend/tests -v
```

## API

- `POST /analyze` – multipart: `file` (VCF), `drug_name`, optional `patient_id`. Returns strict JSON schema.
- `GET /health` – health check.
