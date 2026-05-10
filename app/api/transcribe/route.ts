import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeVideoUrl } from "@/lib/runware";

export const maxDuration = 200;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, videoUrl, generationId } = body;

    let combinedText = text ?? "";

    // Transcribe video audio using Runware Whisper via WebSocket
    if (videoUrl) {
      const transcript = await transcribeVideoUrl(videoUrl);
      if (!transcript) {
        throw new Error("Runware could not transcribe the video audio. Ensure the video has speech content and try again.");
      }
      combinedText = `Video audio transcript:\n\n${transcript}`;
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
