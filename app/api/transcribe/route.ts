import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitCaptionJob } from "@/lib/runware";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, videoUrl, generationId } = body;

    // Video path: submit async caption job, client will poll /api/poll-caption
    if (videoUrl) {
      const captionTaskUUID = await submitCaptionJob(videoUrl);

      if (generationId) {
        await supabase.from("generations").update({ status: "checking" }).eq("id", generationId);
      }

      return NextResponse.json({ captionTaskUUID });
    }

    // Text path: return immediately
    const combinedText = text ?? "";
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
