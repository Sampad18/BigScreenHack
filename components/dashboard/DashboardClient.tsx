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
      completed: { label: "Completed", color: "text-[#6FFF00] bg-[#6FFF00]/10 border-[#6FFF00]/30" },
      failed: { label: "Failed", color: "text-red-400 bg-red-950/50 border-red-800" },
      rejected: { label: "Rejected", color: "text-orange-400 bg-orange-950/50 border-orange-800" },
      processing: { label: "Processing", color: "text-[#EFF4FF]/70 bg-white/5 border-white/10" },
      generating: { label: "Generating", color: "text-[#EFF4FF]/70 bg-white/5 border-white/10" },
    };
    const s = map[status] ?? { label: status, color: "text-[#EFF4FF]/50 bg-white/5 border-white/10" };
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-mono uppercase tracking-wide ${s.color}`}>{s.label}</span>;
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed video background */}
      <video
        className="fixed inset-0 w-full h-full object-cover -z-10"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="fixed inset-0 bg-[#010828]/70 -z-10" />

      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#010828]/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 liquid-glass rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#6FFF00]" />
            </div>
            <span className="font-grotesk text-[#EFF4FF] text-lg uppercase tracking-widest">Helmet.io</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#EFF4FF]/50 hover:text-red-400 font-mono uppercase tracking-wider text-xs">
            <LogOut className="w-4 h-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Profile card */}
        <div className="liquid-glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 liquid-glass rounded-xl flex items-center justify-center text-[#6FFF00] text-xl font-grotesk">
                {profile.full_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <h2 className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-lg">{profile.full_name}</h2>
                <p className="text-[#EFF4FF]/50 font-mono text-sm">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-shrink-0">
              <Coins className="w-5 h-5 text-[#6FFF00]" />
              <div>
                <div className="text-[#EFF4FF] font-grotesk text-lg leading-none">{formatTokens(profile.tokens_remaining)}</div>
                <div className="text-[#EFF4FF]/40 font-mono text-xs mt-0.5 uppercase tracking-wider">tokens remaining</div>
              </div>
              <div className="ml-2 w-24">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6FFF00] rounded-full transition-all"
                    style={{ width: `${tokenPercentage}%` }}
                  />
                </div>
                <div className="text-[#EFF4FF]/30 font-mono text-[10px] mt-1">{tokenPercentage.toFixed(0)}% left</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-[#EFF4FF]/40 font-mono text-xs">
            <div className="w-1.5 h-1.5 bg-[#6FFF00] rounded-full" />
            Each action costs 50 tokens — you have {Math.floor(profile.tokens_remaining / 50)} actions remaining
          </div>
        </div>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {/* Generate Video */}
          <div
            className="group liquid-glass border border-white/10 hover:border-[#6FFF00]/30 rounded-2xl p-6 transition-all hover:bg-white/5 cursor-pointer"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setGenerateOpen(true);
            }}
          >
            <div className="w-12 h-12 bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#6FFF00]/20 transition-colors">
              <Film className="w-6 h-6 text-[#6FFF00]" />
            </div>
            <h3 className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-lg mb-1">Generate Video</h3>
            <p className="text-[#EFF4FF]/50 font-mono text-sm leading-relaxed">
              Create a video from text description or image. Our AI agents will ensure it&apos;s legally compliant before generation.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-[#6FFF00]/70 bg-[#6FFF00]/10 border border-[#6FFF00]/20 px-2 py-0.5 rounded-full font-mono">50 tokens / check</span>
              <span className="text-xs text-[#6FFF00]/70 bg-[#6FFF00]/10 border border-[#6FFF00]/20 px-2 py-0.5 rounded-full font-mono">50 tokens / gen</span>
            </div>
          </div>

          {/* Upload & Check */}
          <div
            className="group liquid-glass border border-white/10 hover:border-[#6FFF00]/30 rounded-2xl p-6 transition-all hover:bg-white/5 cursor-pointer"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setUploadOpen(true);
            }}
          >
            <div className="w-12 h-12 bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#6FFF00]/20 transition-colors">
              <Upload className="w-6 h-6 text-[#6FFF00]" />
            </div>
            <h3 className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-lg mb-1">Check Uploaded Video</h3>
            <p className="text-[#EFF4FF]/50 font-mono text-sm leading-relaxed">
              Upload an existing video to check it against EU and international laws. Get a detailed compliance report.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-[#6FFF00]/70 bg-[#6FFF00]/10 border border-[#6FFF00]/20 px-2 py-0.5 rounded-full font-mono">50 tokens / check</span>
            </div>
          </div>
        </div>

        {/* Recent generations */}
        {generations.length > 0 && (
          <div>
            <h3 className="text-[#EFF4FF] font-grotesk uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6FFF00]" /> Recent Activity
            </h3>
            <div className="space-y-2">
              {generations.map((g) => (
                <div key={g.id} className="liquid-glass border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      {g.status === "completed" ? <CheckCircle className="w-4 h-4 text-[#6FFF00]" /> :
                       g.status === "failed" || g.status === "rejected" ? <XCircle className="w-4 h-4 text-red-400" /> :
                       <XCircle className="w-4 h-4 text-[#EFF4FF]/20" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-[#EFF4FF]/80 font-mono uppercase tracking-wide capitalize">
                        {g.input_type === "video" ? "Video Check" : "Video Generation"}
                      </div>
                      <div className="text-xs text-[#EFF4FF]/30 font-mono">{new Date(g.created_at).toLocaleDateString("en-GB")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadge(g.status)}
                    <span className="text-xs text-[#EFF4FF]/30 font-mono">{g.tokens_spent} tokens</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[#EFF4FF]/50 hover:text-[#6FFF00]"
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
