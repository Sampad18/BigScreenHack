import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { submitVideoJob } from "@/lib/runware";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const prompt: string = body.prompt;
    const generationId: string | undefined = body.generationId;

    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const serviceClient = await createServiceClient();

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

    // Submit to Runware — returns taskUUID immediately, does NOT wait for render
    const taskUUID = await submitVideoJob({ prompt });

    // Deduct tokens on submission
    await serviceClient
      .from("profiles")
      .update({ tokens_remaining: profile.tokens_remaining - 50 })
      .eq("id", user.id);

    return NextResponse.json({ taskUUID, generationId });
  } catch (err) {
    console.error("Video generation submit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation submit failed" },
      { status: 500 }
    );
  }
}
