"""
Drug detection from image: OCR (Tesseract) + deterministic text matching.
Input enhancement only. Does NOT touch CPIC, phenotype, or confidence engines.
Only the 6 supported drugs; no ML; no external paid APIs.
"""
from typing import Tuple, Optional
import io


class TesseractNotAvailableError(Exception):
    """Raised when Tesseract OCR is not installed or not on PATH."""


# Supported drugs only (must match backend.config.ALLOWED_DRUGS)
SUPPORTED_DRUGS = (
    "CODEINE",
    "WARFARIN",
    "CLOPIDOGREL",
    "SIMVASTATIN",
    "AZATHIOPRINE",
    "FLUOROURACIL",
)

# Minimum confidence to return success; below this return error
MIN_CONFIDENCE = 0.6
MAX_CONFIDENCE = 0.99


# Minimum dimension for OCR (camera frames are often small; upscale for better Tesseract results)
_OCR_MIN_SIZE = 800


def _preprocess_for_ocr(img):  # PIL Image
    """Resize if too small and improve contrast so camera captures OCR better."""
    from PIL import Image as PILImage, ImageEnhance
    w, h = img.size
    if w < _OCR_MIN_SIZE or h < _OCR_MIN_SIZE:
        scale = max(_OCR_MIN_SIZE / w, _OCR_MIN_SIZE / h)
        new_w = max(_OCR_MIN_SIZE, int(w * scale))
        new_h = max(_OCR_MIN_SIZE, int(h * scale))
        img = img.resize((new_w, new_h), PILImage.Resampling.LANCZOS)
    img = img.convert("L")  # grayscale often helps Tesseract
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.3)
    return img


def _ocr_image(image_bytes: bytes) -> str:
    """Extract text from image using Tesseract. Returns empty string on failure. Raises TesseractNotAvailableError if Tesseract is not installed."""
    try:
        import pytesseract
        from pytesseract import TesseractNotFoundError
        from PIL import Image
        from backend.config import TESSERACT_CMD
        if TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    except ImportError:
        return ""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img = _preprocess_for_ocr(img)
        text = pytesseract.image_to_string(img)
        return (text or "").strip()
    except TesseractNotAvailableError:
        raise
    except TesseractNotFoundError as e:
        raise TesseractNotAvailableError("Tesseract OCR is not installed or not on PATH. See https://github.com/UB-Mannheim/tesseract/wiki") from e
    except Exception as e:
        err_msg = str(e).lower()
        if "tesseract" in err_msg or "not found" in err_msg or "no such file" in err_msg or "cannot find" in err_msg:
            raise TesseractNotAvailableError("Tesseract OCR is not installed or not on PATH. See https://github.com/UB-Mannheim/tesseract/wiki") from e
        return ""


def _match_drug(text: str) -> Tuple[Optional[str], float]:
    """
    Deterministic matching: find which supported drug appears in text.
    If multiple matches, return the one with highest occurrence count.
    Returns (drug_name, raw_confidence). raw_confidence = matched_keyword_length / total_text_length.
    """
    if not text or not text.strip():
        return None, 0.0
    upper = text.upper()
    total_len = max(len(upper.strip()), 1)
    best_drug = None
    best_count = 0
    for drug in SUPPORTED_DRUGS:
        count = upper.count(drug)
        if count > 0 and (count > best_count or (count == best_count and (not best_drug or len(drug) > len(best_drug)))):
            best_drug = drug
            best_count = count
    if not best_drug:
        return None, 0.0
    matched_keyword_length = len(best_drug) * best_count
    raw_confidence = matched_keyword_length / total_len
    return best_drug, raw_confidence


def detect_drug_from_image(image_bytes: bytes) -> Tuple[Optional[str], float, str]:
    """
    Run OCR on image, then match against supported drugs.
    Returns (detected_drug, confidence, raw_text).
    Any exact substring match to one of the 6 drugs is accepted with confidence >= 0.75,
    so real-world labels (e.g. "Codeine Phosphate Tablets") pass even when the drug name
    is a small fraction of the total OCR text.
    """
    raw_text = _ocr_image(image_bytes)
    drug, raw_conf = _match_drug(raw_text)
    if drug is None:
        return None, 0.0, raw_text
    # Accept any exact match: use at least 0.8 so labels like "CODEINE PHOSPHATE TABLETS" pass
    confidence = round(max(MIN_CONFIDENCE, min(MAX_CONFIDENCE, max(raw_conf, 0.8))), 2)
    return drug, confidence, raw_text
