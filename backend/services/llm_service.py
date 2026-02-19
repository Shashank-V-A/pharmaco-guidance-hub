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


def _fallback_explanation(
    drug: str,
    gene: str,
    phenotype: str,
    risk_label: str,
    guideline: str,
) -> Dict[str, Any]:
    return {
        "summary": f"For {drug}, {gene} phenotype is {phenotype}. Risk: {risk_label}. Follow {guideline} guidelines.",
        "mechanism_explanation": f"{gene} influences metabolism or response to {drug}. Phenotype {phenotype} indicates the expected activity level.",
        "variant_references": [],
        "clinical_rationale": f"Recommendation is based on CPIC guideline for {drug} and {gene} genotype.",
    }


def _extract_json(text: str) -> Optional[Dict]:
    """Extract JSON object from LLM response."""
    text = text.strip()
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
) -> Dict[str, Any]:
    """
    Call Grok API for explanation only. Context is read-only; LLM must not change risk/severity.
    Returns dict with keys: summary, mechanism_explanation, variant_references, clinical_rationale.
    """
    if not GROK_API_KEY or not GROK_API_KEY.strip():
        return _fallback_explanation(drug, gene, phenotype, risk_label, guideline_reference)

    variant_list = "\n".join(
        f"  - {v.get('gene', '')} {v.get('rs', '')} {v.get('genotype', '')}"
        for v in detected_variants[:20]
    )
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

Respond with a single JSON object with exactly these keys (no other text):
- "summary": 2-3 sentences summarizing what this result means for the patient.
- "mechanism_explanation": 2-4 sentences on how the gene affects the drug.
- "variant_references": array of short strings referencing the variants (e.g. ["rs123 (CYP2C19)", ...]). Use only variants listed above.
- "clinical_rationale": 2-3 sentences on why the recommendation follows from the genotype.
Output only valid JSON."""

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
