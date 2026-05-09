"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Film, Upload, LogOut, Coins, Clock, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenerateDialog } from "./GenerateDialog";
import { UploadDialog } from "./UploadDialog";
import { VideoViewerDialog } from "./VideoViewerDialog";
import { formatTokens } from "@/lib/utils";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  tokens_remaining: number;
}

interface Generation {
  id: string;
  input_type: string;
  status: string;
  output_video_url: string | null;
  tokens_spent: number;
  created_at: string;
}

export function DashboardClient({ profile, generations }: { profile: Profile; generations: Generation[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tokenPercentage = Math.min(100, (profile.tokens_remaining / 10000) * 100);

  function statusBadge(status: string) {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: "Completed", color: "text-emerald-400 bg-emerald-950 border-emerald-800" },
      failed: { label: "Failed", color: "text-red-400 bg-red-950 border-red-800" },
      rejected: { label: "Rejected", color: "text-orange-400 bg-orange-950 border-orange-800" },
      processing: { label: "Processing", color: "text-blue-400 bg-blue-950 border-blue-800" },
      generating: { label: "Generating", color: "text-violet-400 bg-violet-950 border-violet-800" },
    };
    const s = map[status] ?? { label: status, color: "text-zinc-400 bg-zinc-800 border-zinc-700" };
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Helmet.io</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-red-400">
            <LogOut className="w-4 h-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Profile card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {profile.full_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">{profile.full_name}</h2>
                <p className="text-zinc-400 text-sm">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-white font-bold text-lg leading-none">{formatTokens(profile.tokens_remaining)}</div>
                <div className="text-zinc-400 text-xs mt-0.5">tokens remaining</div>
              </div>
              <div className="ml-2 w-24">
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                    style={{ width: `${tokenPercentage}%` }}
                  />
                </div>
                <div className="text-zinc-500 text-[10px] mt-1">{tokenPercentage.toFixed(0)}% left</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-zinc-400 text-xs">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Each action costs 50 tokens — you have {Math.floor(profile.tokens_remaining / 50)} actions remaining
          </div>
        </div>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {/* Generate Video */}
          <div className="group bg-zinc-900 border border-zinc-800 hover:border-blue-800/60 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-950/30 cursor-pointer"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setGenerateOpen(true);
            }}>
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-800/40 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
              <Film className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">Generate Video</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Create a video from text description or image. Our AI agents will ensure it&apos;s legally compliant before generation.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-full">50 tokens / check</span>
              <span className="text-xs text-blue-400 bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded-full">50 tokens / generation</span>
            </div>
          </div>

          {/* Upload & Check */}
          <div className="group bg-zinc-900 border border-zinc-800 hover:border-violet-800/60 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-violet-950/30 cursor-pointer"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setUploadOpen(true);
            }}>
            <div className="w-12 h-12 bg-violet-600/20 border border-violet-800/40 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-600/30 transition-colors">
              <Upload className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">Check Uploaded Video</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Upload an existing video to check it against EU and international laws. Get a detailed compliance report.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-full">50 tokens / check</span>
            </div>
          </div>
        </div>

        {/* Recent generations */}
        {generations.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Recent Activity
            </h3>
            <div className="space-y-2">
              {generations.map((g) => (
                <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      {g.status === "completed" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                       g.status === "failed" ? <XCircle className="w-4 h-4 text-red-400" /> :
                       <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200 font-medium capitalize">
                        {g.input_type === "video" ? "Video Check" : "Video Generation"}
                      </div>
                      <div className="text-xs text-zinc-500">{new Date(g.created_at).toLocaleDateString("en-GB")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadge(g.status)}
                    <span className="text-xs text-zinc-500">{g.tokens_spent} tokens</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setViewerId(g.id)}
                    >
                      <Play className="w-3 h-3 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        tokensRemaining={profile.tokens_remaining}
      />
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        tokensRemaining={profile.tokens_remaining}
      />
      <VideoViewerDialog
        generationId={viewerId}
        open={viewerId !== null}
        onOpenChange={(v) => { if (!v) setViewerId(null); }}
      />
    </div>
  );
}
