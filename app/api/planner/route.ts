import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runPlannerAgent } from "@/lib/agents/planner";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content, violations, generationId } = body;
    if (!content || !violations?.length) {
      return NextResponse.json({ error: "content and violations are required" }, { status: 400 });
    }

    const result = await runPlannerAgent(content, violations);

    const serviceClient = await createServiceClient();
    if (generationId) {
      await serviceClient.from("generations").update({
        modified_prompt: result.modifiedPrompt,
        planner_result: result,
        status: "modifying",
      }).eq("id", generationId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Planner agent error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Planner failed" }, { status: 500 });
  }
}
