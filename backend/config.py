"""
Backend configuration. Environment variables override defaults.
Loads .env from project root so GROK_API_KEY / VITE_GROQ_API_KEY are available to the backend.
"""
import os
from pathlib import Path
from typing import Optional

# Load .env from project root (parent of backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

# Allowed scope (strict)
ALLOWED_GENES = {"CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"}
ALLOWED_DRUGS = {"CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"}

# Drug → gene mapping (CPIC)
DRUG_GENE_MAP = {
    "CODEINE": "CYP2D6",
    "WARFARIN": "CYP2C9",
    "CLOPIDOGREL": "CYP2C19",
    "SIMVASTATIN": "SLCO1B1",
    "AZATHIOPRINE": "TPMT",
    "FLUOROURACIL": "DPYD",
}

# API
MAX_VCF_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

# Tesseract OCR (drug detection from image). Set TESSERACT_CMD in .env if not on PATH (e.g. Windows).
def _find_tesseract_cmd() -> Optional[str]:
    env_cmd = os.environ.get("TESSERACT_CMD") or os.environ.get("TESSERACT_PATH")
    if env_cmd and Path(env_cmd).exists():
        return env_cmd
    if os.name == "nt":
        for path in (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ):
            if Path(path).exists():
                return path
    return None

TESSERACT_CMD: Optional[str] = _find_tesseract_cmd()

# LLM explanation only (Groq API: https://console.groq.com). Backend loads .env so VITE_GROQ_API_KEY or GROQ_API_KEY is used.
GROK_API_KEY: Optional[str] = (
    os.environ.get("GROK_API_KEY")
    or os.environ.get("GROQ_API_KEY")
    or os.environ.get("VITE_GROQ_API_KEY")
)
GROK_API_URL: str = os.environ.get("GROK_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROK_MODEL: str = os.environ.get("GROK_MODEL", "llama-3.1-8b-instant")
