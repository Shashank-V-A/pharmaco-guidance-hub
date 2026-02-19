/**
 * LLM service for AI summary and explanations.
 * Uses Groq (free, reliable) first; optional Gemini fallback.
 * Set VITE_GROQ_API_KEY in .env (get free key at https://console.groq.com).
 */

import type { LLMContent } from "@/types/analysis";
import type { AnalysisResult } from "@/types/analysis";

function getGroqKey(): string | undefined {
  return import.meta.env.VITE_GROQ_API_KEY;
}

function getGeminiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
}

function buildPrompt(result: AnalysisResult): string {
  const variantList = result.variants
    .map((v) => `  - ${v.rsid} (${result.gene}): ${v.allele} — ${v.function}`)
    .join("\n");

  return `You are a clinical pharmacogenomics expert. Based on the following pharmacogenomic analysis result, provide three short sections. Be accurate, concise, and use correct biological and clinical terminology.

## Analysis summary
- Drug: ${result.drug}
- Gene: ${result.gene}
- Diplotype: ${result.diplotype}
- Phenotype: ${result.phenotype}
- Risk: ${result.risk}
- Severity: ${result.severity}

## Detected variants
${variantList}

## Your response (JSON only, no markdown)
Respond with a single JSON object with exactly these three keys:
1. "summary": 2–3 sentences summarizing the clinical implication for this patient and drug (what to do, key takeaway).
2. "mechanicalExplanation": 2–4 sentences explaining the mechanism: how the gene/product affects the drug (activation, metabolism, transport) and how the detected genotype leads to the phenotype.
3. "biologicalReasoning": 2–4 sentences on the biological reasoning: why this genotype causes this phenotype (enzyme activity, allele functionality) and how that translates to drug response.

Output only valid JSON, no other text.`;
}

function extractJsonText(raw: string): string {
  let text = raw.trim();
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) text = jsonBlock[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);
  return text;
}

function parseLLMResponse(text: string): LLMContent | null {
  try {
    const content = extractJsonText(text);
    const parsed = JSON.parse(content) as {
      summary?: string;
      mechanicalExplanation?: string;
      biologicalReasoning?: string;
    };
    return {
      summary: String(parsed.summary ?? "").trim() || "No summary generated.",
      mechanicalExplanation:
        String(parsed.mechanicalExplanation ?? "").trim() ||
        "No mechanical explanation generated.",
      biologicalReasoning:
        String(parsed.biologicalReasoning ?? "").trim() ||
        "No biological reasoning generated.",
    };
  } catch {
    return null;
  }
}

/** Groq: free tier, OpenAI-compatible API */
async function tryGroq(prompt: string): Promise<LLMContent | null> {
  const apiKey = getGroqKey();
  if (!apiKey?.trim()) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    console.error("Groq API error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? parseLLMResponse(text) : null;
}

/** Gemini: optional fallback */
async function tryGemini(prompt: string): Promise<LLMContent | null> {
  const apiKey = getGeminiKey();
  if (!apiKey?.trim()) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text ? parseLLMResponse(text) : null;
}

export async function fetchLLMExplanations(
  result: AnalysisResult
): Promise<LLMContent | null> {
  const prompt = buildPrompt(result);

  const groq = await tryGroq(prompt);
  if (groq) return groq;

  const gemini = await tryGemini(prompt);
  if (gemini) return gemini;

  return null;
}

export function isLLMAvailable(): boolean {
  return Boolean(getGroqKey()?.trim() || getGeminiKey()?.trim());
}
