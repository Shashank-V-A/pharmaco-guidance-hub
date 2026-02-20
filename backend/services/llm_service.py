"""
LLM service (Grok API): explanation only. Does NOT modify risk_label, severity, or invent variants.
Returns strict JSON: summary, mechanism_explanation, variant_references[], clinical_rationale.
If LLM fails → fallback explanation.
"""
import json
import re
from typing import Dict, Any, List, Optional
import httpx
from backend.config import GROK_API_KEY, GROK_API_URL, GROK_MODEL


# Rule 9: exact fallback when LLM fails (only used when rule_engine succeeded)
LLM_FAILURE_FALLBACK: Dict[str, Any] = {
    "summary": "Explanation unavailable.",
    "mechanism_explanation": "Deterministic CPIC rule applied.",
    "variant_references": [],
    "clinical_rationale": "Based on CPIC guidelines.",
}


def _fallback_explanation(
    drug: str,
    gene: str,
    phenotype: str,
    risk_label: str,
    guideline: str,
) -> Dict[str, Any]:
    return {
        "summary": LLM_FAILURE_FALLBACK["summary"],
        "mechanism_explanation": LLM_FAILURE_FALLBACK["mechanism_explanation"],
        "variant_references": list(LLM_FAILURE_FALLBACK["variant_references"]),
        "clinical_rationale": LLM_FAILURE_FALLBACK["clinical_rationale"],
    }


def _extract_json(text: str) -> Optional[Dict]:
    """Extract JSON object from LLM response. Handles raw JSON or markdown code blocks."""
    if not text:
        return None
    text = text.strip()
    # Unwrap ```json ... ``` or ``` ... ```
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if code_block:
        text = code_block.group(1).strip()
    # Find first { ... } object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def fetch_llm_explanation(
    drug: str,
    gene: str,
    phenotype: str,
    risk_label: str,
    severity: str,
    guideline_reference: str,
    detected_variants: List[Dict[str, Any]],
    explanation_mode: str = "clinician",
) -> Dict[str, Any]:
    """
    Call Grok API for explanation only. Context is read-only; LLM must not change risk/severity.
    explanation_mode: "clinician" (short, action-focused) | "research" (detailed mechanism, variant impact, PK).
    Returns dict with keys: summary, mechanism_explanation, variant_references, clinical_rationale.
    """
    if not GROK_API_KEY or not GROK_API_KEY.strip():
        return _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)

    variant_list = "\n".join(
        f"  - {v.get('gene', '')} {v.get('rs', '')} {v.get('genotype', '')}"
        for v in detected_variants[:20]
    )
    mode = "research" if (explanation_mode or "").strip().lower() == "research" else "clinician"
    if mode == "clinician":
        instruction = """Respond with a single JSON object with exactly these keys (no other text):
- "summary": 1-2 short sentences: what this means for the patient and what to do.
- "mechanism_explanation": 1-2 concise sentences on how the gene affects the drug (action-focused).
- "variant_references": array of short strings referencing the variants (e.g. ["rs123 (CYP2C19)", ...]). Use only variants listed above.
- "clinical_rationale": 1-2 sentences on why the recommendation follows from the genotype.
Keep all text brief and actionable. Output only valid JSON."""
    else:
        instruction = """Respond with a single JSON object with exactly these keys (no other text):
- "summary": 2-4 sentences summarizing the result and implications.
- "mechanism_explanation": 3-6 sentences: detailed molecular mechanism, variant impact on enzyme activity, and pharmacokinetic relevance.
- "variant_references": array of short strings referencing the variants (e.g. ["rs123 (CYP2C19)", ...]). Use only variants listed above.
- "clinical_rationale": 2-4 sentences on why the recommendation follows from the genotype and evidence.
Output only valid JSON."""

    prompt = f"""You are a clinical pharmacogenomics educator. Provide an explanation ONLY. Do not change or suggest any risk label, severity, or recommendation.

Context (do not modify):
- Drug: {drug}
- Gene: {gene}
- Phenotype: {phenotype}
- Risk label: {risk_label}
- Severity: {severity}
- Guideline: {guideline_reference}
- Detected variants:
{variant_list or '  (none)'}

{instruction}"""

    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(
                GROK_API_URL,
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 800,
                },
            )
            if r.status_code != 200:
                return _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)
            data = r.json()
            content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
    except Exception:
        return _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)

    parsed = _extract_json(content)
    if not parsed:
        return _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)

    summary = (parsed.get("summary") or "").strip() or _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)["summary"]
    mechanism = (parsed.get("mechanism_explanation") or "").strip() or "Mechanism follows CPIC guideline."
    refs = parsed.get("variant_references")
    if not isinstance(refs, list):
        refs = []
    variant_references = [str(x).strip() for x in refs if x][:20]
    rationale = (parsed.get("clinical_rationale") or "").strip() or "Based on CPIC guideline."

    return {
        "summary": summary,
        "mechanism_explanation": mechanism,
        "variant_references": variant_references,
        "clinical_rationale": rationale,
    }
