import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateVideo } from "@/lib/runware";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let generationId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const prompt: string = body.prompt;
    generationId = body.generationId;

    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const serviceClient = await createServiceClient();

    // Check tokens
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("tokens_remaining")
      .eq("id", user.id)
      .single();

    if (!profile || profile.tokens_remaining < 50) {
      return NextResponse.json({ error: "Insufficient tokens for video generation" }, { status: 402 });
    }

    if (generationId) {
      await serviceClient
        .from("generations")
        .update({ status: "generating" })
        .eq("id", generationId);
    }

    // Generate video — Runware returns a CDN URL directly
    const videoUrl = await generateVideo({ prompt });

    console.log("Video URL to save:", videoUrl);

    // Deduct tokens and save the video URL
    await serviceClient
      .from("profiles")
      .update({ tokens_remaining: profile.tokens_remaining - 50 })
      .eq("id", user.id);

    if (generationId) {
      const { error: updateErr } = await serviceClient
        .from("generations")
        .update({
          output_video_url: videoUrl,
          status: "completed",
          tokens_spent: 100,
        })
        .eq("id", generationId);

      if (updateErr) console.error("Failed to update generation record:", updateErr);
    }

    return NextResponse.json({ videoUrl });
  } catch (err) {
    console.error("Video generation error:", err);
    if (generationId) {
      try {
        const serviceClient = await createServiceClient();
        await serviceClient
          .from("generations")
          .update({ status: "failed" })
          .eq("id", generationId);
      } catch {}
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
