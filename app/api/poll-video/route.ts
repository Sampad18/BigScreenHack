import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { pollVideoJob } from "@/lib/runware";

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const taskUUID = searchParams.get("taskUUID");
    const generationId = searchParams.get("generationId");

    if (!taskUUID) return NextResponse.json({ error: "taskUUID is required" }, { status: 400 });

    const result = await pollVideoJob(taskUUID);

    if (result.status === "completed" && result.videoUrl && generationId) {
      const serviceClient = await createServiceClient();
      await serviceClient
        .from("generations")
        .update({
          output_video_url: result.videoUrl,
          status: "completed",
          tokens_spent: 100,
        })
        .eq("id", generationId);
    }

    if (result.status === "failed" && generationId) {
      const serviceClient = await createServiceClient();
      await serviceClient
        .from("generations")
        .update({ status: "failed" })
        .eq("id", generationId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Poll video error:", err);
    return NextResponse.json({ status: "pending" });
  }
}
