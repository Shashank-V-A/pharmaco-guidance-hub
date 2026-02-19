/**
 * CPIC-aligned drug–gene pairs for pharmacogenomic risk assessment.
 * Used to determine which gene to assess once a drug is identified.
 */
export const DRUG_GENE_MAP: Record<string, string> = {
  codeine: "CYP2D6",
  warfarin: "CYP2C9",
  clopidogrel: "CYP2C19",
  simvastatin: "SLCO1B1",
  azathioprine: "TPMT",
  fluorouracil: "DPYD",
  tamoxifen: "CYP2D6",
  abacavir: "HLA-B",
  carbamazepine: "HLA-A",
};

export const DRUGS = Object.keys(DRUG_GENE_MAP).map(
  (key) => key.charAt(0).toUpperCase() + key.slice(1)
);

export function getGeneForDrug(drug: string): string | undefined {
  const key = drug.trim().toLowerCase();
  return DRUG_GENE_MAP[key];
}

export function getDrugDisplayName(drug: string): string {
  const key = drug.trim().toLowerCase();
  if (!key) return drug;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Drug names sorted by length descending for OCR matching (longer names first to avoid partial matches). */
export const DRUG_NAMES_FOR_OCR = Object.keys(DRUG_GENE_MAP).sort((a, b) => b.length - a.length);

/**
 * Find a drug name in raw text (e.g. from OCR). Case-insensitive; returns the first matching known drug.
 * Applies mild OCR normalization (0→O, 1→I) to improve label recognition.
 */
export function matchDrugFromText(text: string): string | undefined {
  const raw = text.toUpperCase().replace(/\s+/g, " ");
  const normalized = raw.replace(/0/g, "O").replace(/1/g, "I");
  for (const drugKey of DRUG_NAMES_FOR_OCR) {
    const keyUpper = drugKey.toUpperCase();
    if (raw.includes(keyUpper) || normalized.includes(keyUpper)) return drugKey;
  }
  return undefined;
}
