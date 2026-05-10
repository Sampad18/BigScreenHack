import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeVideoUrl } from "@/lib/runware";

export const maxDuration = 200;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, videoUrl, generationId } = body;

    let combinedText = text ?? "";

    // Video-to-text analysis using Runware's video understanding model
    if (videoUrl) {
      const analysis = await analyzeVideoUrl(videoUrl);
      if (!analysis) {
        throw new Error("Runware could not analyze the video. Please try again.");
      }
      combinedText = `Video content analysis:\n\n${analysis}`;
    }

    if (generationId) {
      await supabase.from("generations").update({
        original_prompt: combinedText,
        status: "checking",
      }).eq("id", generationId);
    }

    return NextResponse.json({ combinedText });
  } catch (err) {
    console.error("Transcribe error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Video analysis failed",
    }, { status: 500 });
  }
}
