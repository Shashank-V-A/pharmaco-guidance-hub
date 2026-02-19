"""
Backend configuration. Environment variables override defaults.
"""
import os
from typing import Optional

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

# Grok (LLM explanation only)
GROK_API_KEY: Optional[str] = os.environ.get("GROK_API_KEY") or os.environ.get("VITE_GROQ_API_KEY")
GROK_API_URL: str = os.environ.get("GROK_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROK_MODEL: str = os.environ.get("GROK_MODEL", "llama-3.1-8b-instant")
