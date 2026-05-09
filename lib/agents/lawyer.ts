import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export interface RuleViolation {
  ruleCode: string;
  ruleTitle: string;
  severity: string;
  explanation: string;
  legalReference: string;
  specificContent: string;
}

export interface LawyerResult {
  isCompliant: boolean;
  violations: RuleViolation[];
  summary: string;
  riskLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export async function runLawyerAgent(
  content: string,
  rules: Array<{
    code: string;
    title: string;
    description: string;
    severity: string;
    legal_reference: string;
    detection_criteria: string;
    remediation_hint: string;
    jurisdiction: string;
    category_name: string;
  }>
): Promise<LawyerResult> {
  const rulesText = rules
    .map(
      (r) =>
        `[${r.code}] ${r.title} (${r.severity}, ${r.jurisdiction})
Category: ${r.category_name}
Legal Basis: ${r.legal_reference}
Description: ${r.description}
Detection Criteria: ${r.detection_criteria}
Remediation: ${r.remediation_hint}`
    )
    .join("\n\n---\n\n");

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Helmet.io's Legal Compliance Agent — an expert in EU AI Act, GDPR, copyright law, content safety standards, and international media regulations.

Your task is to analyze video content (either a transcript or a text prompt describing a video) against a comprehensive set of legal rules. You must be thorough, precise, and identify ALL potential violations.

IMPORTANT RULES:
1. Check each rule systematically
2. Quote specific parts of the content that trigger each violation
3. Do not invent violations — only flag what is clearly present
4. If content is ambiguous, err on the side of caution for CRITICAL/HIGH severity rules
5. Always output valid JSON

Output ONLY a JSON object with this exact structure:
{
  "isCompliant": boolean,
  "violations": [
    {
      "ruleCode": "string",
      "ruleTitle": "string",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "explanation": "string (explain why this specific content violates this rule)",
      "legalReference": "string",
      "specificContent": "string (quote the exact part of the content that triggered this)"
    }
  ],
  "summary": "string (2-3 sentence summary of compliance status)",
  "riskLevel": "NONE|LOW|MEDIUM|HIGH|CRITICAL"
}`,
      },
      {
        role: "user",
        content: `Analyze the following content for legal compliance:

---CONTENT TO ANALYZE---
${content}
---END CONTENT---

Check against these rules:

${rulesText}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Lawyer agent returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as LawyerResult;
}
