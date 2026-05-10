import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pollCaptionJob } from "@/lib/runware";

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

    const result = await pollCaptionJob(taskUUID);

    if (result.status === "completed" && result.text && generationId) {
      await supabase
        .from("generations")
        .update({ original_prompt: result.text })
        .eq("id", generationId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Poll caption error:", err);
    return NextResponse.json({ status: "pending" });
  }
}
