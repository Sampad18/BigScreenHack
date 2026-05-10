import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captionImage } from "@/lib/runware";

export const maxDuration = 200;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text, imageBase64, imageFrames, generationId } = body;

    let combinedText = text ?? "";

    // AI visual analysis: caption multiple video frames extracted client-side
    if (imageFrames?.length) {
      const captions = await Promise.all(
        (imageFrames as string[]).map((frame, i) =>
          captionImage(frame)
            .then((c) => (c ? `Frame ${i + 1}: ${c}` : null))
            .catch((err) => { console.error(`Frame ${i + 1} caption error:`, err); return null; })
        )
      );
      const valid = captions.filter(Boolean) as string[];
      if (valid.length === 0) {
        throw new Error("Runware frame captioning failed for all frames. Check your RUNWARE_API_KEY in Vercel environment variables.");
      }
      combinedText = `Video visual analysis (${valid.length} key frames):\n\n${valid.join("\n\n")}`;
    }

    // Caption a single image (used by GenerateDialog for image input)
    if (imageBase64) {
      try {
        const caption = await captionImage(imageBase64);
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
