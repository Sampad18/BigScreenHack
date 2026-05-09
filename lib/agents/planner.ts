import OpenAI from "openai";
import type { RuleViolation } from "./lawyer";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export interface PlannerResult {
  modifiedPrompt: string;
  changes: Array<{
    original: string;
    modified: string;
    reason: string;
    ruleCode: string;
  }>;
  audioScript: string;
  contextPreservationScore: number;
}

export async function runPlannerAgent(
  originalContent: string,
  violations: RuleViolation[]
): Promise<PlannerResult> {
  const violationsText = violations
    .map(
      (v) =>
        `Rule: ${v.ruleCode} - ${v.ruleTitle} (${v.severity})
Violation: ${v.explanation}
Specific Content: "${v.specificContent}"
Legal Reference: ${v.legalReference}`
    )
    .join("\n\n---\n\n");

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Helmet.io's Creative Compliance Planner — an expert at modifying video content prompts to comply with legal requirements while preserving the creative intent and core message.

Your goals:
1. Fix ALL identified violations
2. Preserve as much of the original creative intent as possible
3. Make minimal necessary changes
4. Explain every change clearly
5. Write a clear audio script for the ElevenLabs voice agent to read to the user

The audio script should:
- Sound natural and conversational (it will be read aloud)
- Start by explaining what rules were violated and why
- Explain each change made and how it fixes the violation
- End by asking the user to accept or reject the modified version
- Be professional but friendly
- Be 2-4 minutes when read at normal speech pace

Output ONLY a JSON object with this exact structure:
{
  "modifiedPrompt": "string (the complete rewritten prompt/content)",
  "changes": [
    {
      "original": "string (what was changed)",
      "modified": "string (what it was changed to)",
      "reason": "string (why this change was needed)",
      "ruleCode": "string"
    }
  ],
  "audioScript": "string (the full script for the voice agent to read)",
  "contextPreservationScore": number (0-100, how much of original intent was preserved)
}`,
      },
      {
        role: "user",
        content: `Modify the following content to fix all legal violations:

---ORIGINAL CONTENT---
${originalContent}
---END CONTENT---

Violations to fix:
${violationsText}

Create a modified version that fixes all violations while preserving as much of the original creative intent as possible.`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Planner agent returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as PlannerResult;
}
