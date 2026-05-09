import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { textToSpeech } from "@/lib/elevenlabs";
import OpenAI from "openai";

interface Violation {
  ruleCode: string;
  ruleTitle: string;
  severity: string;
  explanation: string;
  legalReference: string;
}

function buildViolationScript(violations: Violation[]): string {
  const count = violations.length;
  const ruleList = violations
    .map((v) => `${v.ruleTitle}, ${v.severity.toLowerCase()} severity`)
    .join("; ");
  return `Helmet detected ${count} violation${count !== 1 ? "s" : ""}. ${ruleList}. A compliant version is ready for your review.`;
}

async function buildDescriptionScript(content: string): Promise<string> {
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content: "Write a natural spoken audio script of 2-3 sentences (under 75 words) describing what a video shows based on the visual analysis. Start with 'This video shows'. End with 'No rules are being broken. This content is fully compliant.' Sound conversational, not robotic.",
      },
      {
        role: "user",
        content,
      },
    ],
  });

  return response.choices[0].message.content?.trim() ??
    `This video depicts ${content.slice(0, 150)}. No rules are being broken. This content is fully compliant.`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { violations, content, generationId } = body as {
      violations?: Violation[];
      content?: string;
      generationId?: string;
    };

    let script: string;

    if (violations?.length) {
      // Violations found — list the broken rules
      script = buildViolationScript(violations);
    } else if (content) {
      // No violations — describe what the video is about
      script = await buildDescriptionScript(content);
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(script);
    const base64 = audioBuffer.toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    return NextResponse.json({ audioUrl });
  } catch (err) {
    console.error("Audio generation error:", err);
    return NextResponse.json({ audioUrl: null, error: err instanceof Error ? err.message : "Audio failed" });
  }
}
