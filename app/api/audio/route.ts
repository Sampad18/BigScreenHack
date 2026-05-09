import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { textToSpeech } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { script, generationId } = await req.json();
    if (!script) return NextResponse.json({ error: "script is required" }, { status: 400 });

    const audioBuffer = await textToSpeech(script);

    // Upload audio to Supabase storage
    const serviceClient = await createServiceClient();
    const audioPath = `${user.id}/${Date.now()}-explanation.mp3`;
    const { error: uploadErr } = await serviceClient.storage
      .from("audio")
      .upload(audioPath, audioBuffer, { contentType: "audio/mpeg" });

    if (uploadErr) throw new Error("Audio upload failed: " + uploadErr.message);

    const { data: { publicUrl } } = serviceClient.storage.from("audio").getPublicUrl(audioPath);

    if (generationId) {
      await serviceClient.from("generations").update({
        audio_explanation_url: publicUrl,
      }).eq("id", generationId);
    }

    return NextResponse.json({ audioUrl: publicUrl });
  } catch (err) {
    console.error("Audio generation error:", err);
    // Return empty audioUrl rather than failing the whole pipeline
    return NextResponse.json({ audioUrl: null, error: err instanceof Error ? err.message : "Audio failed" });
  }
}
