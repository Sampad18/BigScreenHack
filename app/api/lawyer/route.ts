import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runLawyerAgent } from "@/lib/agents/lawyer";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content, generationId } = body;
    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    // Deduct 50 tokens for a check
    const serviceClient = await createServiceClient();
    const { data: profile } = await serviceClient.from("profiles").select("tokens_remaining").eq("id", user.id).single();
    if (!profile || profile.tokens_remaining < 50) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 402 });
    }

    // Load all active rules with their categories
    const { data: rules } = await serviceClient
      .from("rules")
      .select("code, title, description, severity, legal_reference, detection_criteria, remediation_hint, jurisdiction, rule_categories(name)")
      .eq("is_active", true);

    if (!rules?.length) return NextResponse.json({ error: "No rules found in database" }, { status: 500 });

    const rulesForAgent = rules.map((r) => ({
      code: r.code,
      title: r.title,
      description: r.description,
      severity: r.severity,
      legal_reference: r.legal_reference,
      detection_criteria: r.detection_criteria,
      remediation_hint: r.remediation_hint,
      jurisdiction: r.jurisdiction,
      category_name: (r.rule_categories as unknown as { name: string } | null)?.name ?? "Unknown",
    }));

    const result = await runLawyerAgent(content, rulesForAgent);

    // Deduct tokens and update generation
    await serviceClient.from("profiles").update({
      tokens_remaining: profile.tokens_remaining - 50,
    }).eq("id", user.id);

    if (generationId) {
      await serviceClient.from("generations").update({
        lawyer_result: result,
        status: result.isCompliant ? "approved" : "modifying",
        tokens_spent: 50,
      }).eq("id", generationId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Lawyer agent error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Agent failed" }, { status: 500 });
  }
}
