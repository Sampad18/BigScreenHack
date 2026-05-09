import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeVideo, captionImage } from "@/lib/runware";

export const maxDuration = 200;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, imageBase64, videoUrl, generationId } = body;

    let combinedText = text ?? "";

    // Transcribe uploaded video → use Runware "transcription" taskType
    if (videoUrl) {
      const transcript = await transcribeVideo(videoUrl);
      combinedText = transcript;
    }

    // Caption image → use Runware "caption" taskType
    // Pass the full data URI directly — Runware accepts data:image/...;base64,... format
    if (imageBase64) {
      try {
        const caption = await captionImage(imageBase64);
        if (caption) {
          combinedText = combinedText
            ? `${combinedText}\n\nImage description: ${caption}`
            : `Image description: ${caption}`;
        }
      } catch (captionErr) {
        // Non-fatal: continue with text-only if captioning fails
        console.error("Image caption error:", captionErr);
      }
    }

    // Update generation record
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
      error: err instanceof Error ? err.message : "Transcription failed",
    }, { status: 500 });
  }
}
