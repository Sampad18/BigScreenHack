"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Upload, LogOut, Coins, Clock, CheckCircle, XCircle, Loader2, Play, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { HelmetLogo } from "@/components/HelmetLogo";
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
    const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      completed: { 
        label: "Completed", 
        icon: <CheckCircle className="w-3 h-3" />,
        className: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800" 
      },
      failed: { 
        label: "Failed", 
        icon: <XCircle className="w-3 h-3" />,
        className: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800" 
      },
      rejected: { 
        label: "Rejected", 
        icon: <XCircle className="w-3 h-3" />,
        className: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800" 
      },
      processing: { 
        label: "Processing", 
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        className: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950 dark:border-sky-800" 
      },
      generating: { 
        label: "Generating", 
        icon: <Sparkles className="w-3 h-3" />,
        className: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800" 
      },
    };
    const s = map[status] ?? { 
      label: status, 
      icon: null,
      className: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700" 
    };
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${s.className}`}>
        {s.icon}
        {s.label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelmetLogo className="w-9 h-9 text-sky-600" />
            <span className="font-bold text-foreground text-xl tracking-tight">Helmet.io</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground">Create legally compliant AI videos with confidence</p>
        </div>

        {/* Stats cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Tokens card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-center">
                <Coins className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{formatTokens(profile.tokens_remaining)}</div>
                <div className="text-sm text-muted-foreground">Tokens remaining</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="text-foreground font-medium">{tokenPercentage.toFixed(0)}% left</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${tokenPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Actions remaining */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{Math.floor(profile.tokens_remaining / 50)}</div>
                <div className="text-sm text-muted-foreground">Actions remaining</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Each compliance check or video generation costs 50 tokens</p>
          </div>

          {/* Total generations */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center">
                <Film className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{generations.length}</div>
                <div className="text-sm text-muted-foreground">Total generations</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Videos created with Helmet.io</p>
          </div>
        </div>

        {/* Action cards */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Create New</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {/* Generate Video */}
          <button
            className="group bg-card border border-border hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 text-left card-hover"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setGenerateOpen(true);
            }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
              <Film className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Generate Video</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Create a video from text description or image. Our AI agents will ensure it&apos;s legally compliant before generation.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">50 tokens / check</span>
              <span className="text-xs font-medium text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-full">50 tokens / generation</span>
            </div>
          </button>

          {/* Upload & Check */}
          <button
            className="group bg-card border border-border hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 text-left card-hover"
            onClick={() => {
              if (profile.tokens_remaining < 50) { toast.error("Insufficient tokens"); return; }
              setUploadOpen(true);
            }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Check Uploaded Video</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Upload an existing video to check it against EU and international laws. Get a detailed compliance report.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">50 tokens / check</span>
            </div>
          </button>
        </div>

        {/* Recent generations */}
        {generations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" /> Recent Activity
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-border">
                {generations.map((g) => (
                  <div key={g.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        g.status === "completed" 
                          ? "bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800" 
                          : g.status === "failed" 
                          ? "bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800"
                          : "bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800"
                      }`}>
                        {g.status === "completed" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                         g.status === "failed" ? <XCircle className="w-5 h-5 text-red-600" /> :
                         <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground font-medium capitalize">
                          {g.input_type === "video" ? "Video Compliance Check" : "Video Generation"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(g.created_at).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {statusBadge(g.status)}
                      <span className="text-xs text-muted-foreground font-medium">{g.tokens_spent} tokens</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 border-border hover:bg-muted"
                        onClick={() => setViewerId(g.id)}
                      >
                        <Play className="w-3 h-3 mr-1.5" /> View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {generations.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No generations yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first legally compliant AI video</p>
            <Button 
              onClick={() => setGenerateOpen(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25"
            >
              <Film className="w-4 h-4 mr-2" /> Generate Video
            </Button>
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
