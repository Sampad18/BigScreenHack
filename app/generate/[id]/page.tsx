import React from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield, ArrowLeft, Download, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

export default async function GenerationPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gen } = await supabase
    .from("generations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!gen) notFound();

  const statusIcon = ({
    completed: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    failed: <XCircle className="w-5 h-5 text-red-400" />,
    rejected: <XCircle className="w-5 h-5 text-orange-400" />,
  } as Record<string, React.ReactElement>)[gen.status] ?? <Clock className="w-5 h-5 text-blue-400" />;

  const violations = gen.lawyer_result?.violations ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">Helmet.io</span>
          </div>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 text-sm">Generation</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusIcon}
            <div>
              <h1 className="text-white font-semibold text-xl capitalize">
                {gen.input_type === "video" ? "Video Check" : "Video Generation"}
              </h1>
              <p className="text-zinc-400 text-sm">
                {new Date(gen.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </p>
            </div>
          </div>
          <div className="text-sm text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg">
            {gen.tokens_spent} tokens used
          </div>
        </div>

        {/* Video player */}
        {gen.output_video_url ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-300 text-sm font-medium">Generated Video</span>
              <a
                href={gen.output_video_url}
                download={`helmet-video-${gen.id}.mp4`}
                className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
            <video
              src={gen.output_video_url}
              controls
              autoPlay={false}
              className="w-full bg-black max-h-[480px]"
            />
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 flex flex-col items-center gap-3 text-zinc-500">
            <XCircle className="w-10 h-10" />
            <p>No video available for this generation.</p>
          </div>
        )}

        {/* Original prompt */}
        {gen.original_prompt && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-2">Original Prompt</h2>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{gen.original_prompt}</p>
          </div>
        )}

        {/* Modified prompt */}
        {gen.modified_prompt && gen.modified_prompt !== gen.original_prompt && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Compliant Prompt
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{gen.modified_prompt}</p>
          </div>
        )}

        {/* Violations */}
        {violations.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {violations.length} Violation{violations.length !== 1 ? "s" : ""} Detected
            </h2>
            <div className="space-y-3">
              {violations.map((v: {
                ruleCode: string; ruleTitle: string; severity: string;
                explanation: string; legalReference: string;
              }) => {
                const colors: Record<string, string> = {
                  CRITICAL: "border-red-800/50 bg-red-950/20",
                  HIGH: "border-orange-800/50 bg-orange-950/20",
                  MEDIUM: "border-yellow-800/50 bg-yellow-950/20",
                  LOW: "border-blue-800/50 bg-blue-950/20",
                };
                const badges: Record<string, string> = {
                  CRITICAL: "text-red-400 bg-red-950 border-red-800",
                  HIGH: "text-orange-400 bg-orange-950 border-orange-800",
                  MEDIUM: "text-yellow-400 bg-yellow-950 border-yellow-800",
                  LOW: "text-blue-400 bg-blue-950 border-blue-800",
                };
                return (
                  <div key={v.ruleCode} className={`border rounded-xl p-4 ${colors[v.severity] ?? "border-zinc-700 bg-zinc-800/20"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 mt-0.5 ${badges[v.severity] ?? ""}`}>
                        {v.severity}
                      </span>
                      <div>
                        <div className="text-zinc-200 text-sm font-medium">{v.ruleTitle}</div>
                        <div className="text-zinc-400 text-xs mt-1">{v.explanation}</div>
                        <div className="text-zinc-500 text-xs mt-1 font-mono">{v.legalReference}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audio explanation */}
        {gen.audio_explanation_url && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-3">Agent Audio Explanation</h2>
            <audio src={gen.audio_explanation_url} controls className="w-full accent-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}
