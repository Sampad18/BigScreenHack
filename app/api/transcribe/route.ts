import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captionVideoContent } from "@/lib/runware";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, videoUrl, generationId } = body;

    let combinedText = text ?? "";

    if (videoUrl) {
      const caption = await captionVideoContent(videoUrl);
      if (!caption) {
        throw new Error("Runware could not analyze the video content. Ensure the video is accessible and try again.");
      }
      combinedText = `Video content description:\n\n${caption}`;
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
