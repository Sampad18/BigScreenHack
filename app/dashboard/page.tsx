import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: generations } = await supabase
    .from("generations")
    .select("id, input_type, status, output_video_url, tokens_spent, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <DashboardClient
      profile={profile ?? { id: user.id, email: user.email ?? "", full_name: user.email?.split("@")[0] ?? "User", tokens_remaining: 10000 }}
      generations={generations ?? []}
    />
  );
}
