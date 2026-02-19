/**
 * Minimal VCF parser for pharmacogenomic variant extraction.
 * Reads VCF text and returns genotypes for a set of target rsids.
 */

export interface VcfVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  rsid: string;
  /** Genotype e.g. "0/1", "1/1", "0|1" */
  genotype: string;
}

/**
 * Parse VCF file content and return variants matching the given rsids.
 * Looks for ID column (rsid) and parses GT from first sample if FORMAT contains GT.
 */
export function parseVcfForRsids(vcfText: string, targetRsids: Set<string>): VcfVariant[] {
  const lines = vcfText.split(/\r?\n/);
  const result: VcfVariant[] = [];
  let formatIdx = -1;
  let gtIdx = -1;

  for (const line of lines) {
    if (line.startsWith("##")) continue;
    if (line.startsWith("#")) {
      // Header: #CHROM POS REF ALT QUAL FILTER INFO FORMAT [sample1 ...]
      const parts = line.slice(1).split("\t");
      const formatCol = parts[8];
      if (formatCol) {
        formatIdx = 8;
        const formatKeys = formatCol.split(":");
        gtIdx = formatKeys.indexOf("GT");
      }
      continue;
    }

    const parts = line.split("\t");
    if (parts.length < 8) continue;

    const chrom = parts[0];
    const pos = parseInt(parts[1], 10);
    const ref = parts[3];
    const alt = parts[4];
    const idCol = parts[2]; // can be rsid or . or semicolon-separated
    const ids = idCol.split(";").filter(Boolean);
    const rsid = ids.find((i) => i.startsWith("rs")) ?? (idCol && idCol !== "." ? idCol : "");

    if (!targetRsids.has(rsid)) continue;

    let genotype = "./.";
    if (gtIdx >= 0 && parts.length > 9) {
      const sampleCol = parts[9];
      const sampleParts = sampleCol.split(":");
      if (sampleParts[gtIdx] !== undefined) {
        genotype = sampleParts[gtIdx].replace("|", "/");
      }
    }

    result.push({
      chrom,
      pos,
      ref,
      alt,
      rsid,
      genotype,
    });
  }

  return result;
}

/**
 * Parse VCF and return variants for any of the given rsids.
 * Target rsids should be lowercase for case-insensitive match if needed.
 */
export function parseVcf(vcfText: string, targetRsids: string[]): VcfVariant[] {
  const set = new Set(targetRsids.map((r) => r.trim()));
  return parseVcfForRsids(vcfText, set);
}
