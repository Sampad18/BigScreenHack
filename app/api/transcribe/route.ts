import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captionImages } from "@/lib/runware";

export const maxDuration = 200;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, imageBase64, imageFrames, generationId } = body;

    let combinedText = text ?? "";

    // AI visual analysis: caption video frames via Runware WebSocket
    if (imageFrames?.length) {
      const frames = imageFrames as string[];
      const captions = await captionImages(frames);
      const valid = captions
        .map((c, i) => (c ? `Frame ${i + 1}: ${c}` : null))
        .filter(Boolean) as string[];
      if (valid.length === 0) {
        throw new Error("Runware frame captioning returned no results. Check RUNWARE_API_KEY and try again.");
      }
      combinedText = `Video visual analysis (${valid.length} key frames):\n\n${valid.join("\n\n")}`;
    }

    // Caption a single image (used by GenerateDialog for image input)
    if (imageBase64) {
      try {
        const [caption] = await captionImages([imageBase64]);
        if (caption) {
          combinedText = combinedText
            ? `${combinedText}\n\nImage description: ${caption}`
            : `Image description: ${caption}`;
        }
      } catch (captionErr) {
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
      error: err instanceof Error ? err.message : "Video analysis failed",
    }, { status: 500 });
  }
}
