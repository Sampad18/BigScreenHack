"use client";
import { useState, useEffect } from "react";
import { Download, AlertTriangle, CheckCircle, Volume2, Shield, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface Generation {
  id: string;
  input_type: string;
  status: string;
  output_video_url: string | null;
  original_prompt: string | null;
  modified_prompt: string | null;
  tokens_spent: number;
  created_at: string;
  lawyer_result: { violations: Violation[] } | null;
  audio_explanation_url: string | null;
}

interface Violation {
  ruleCode: string;
  ruleTitle: string;
  severity: string;
  explanation: string;
  legalReference: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-950/50 border-red-800",
  HIGH: "text-orange-400 bg-orange-950/50 border-orange-800",
  MEDIUM: "text-yellow-400 bg-yellow-950/50 border-yellow-800",
  LOW: "text-blue-400 bg-blue-950/50 border-blue-800",
};

export function VideoViewerDialog({
  generationId,
  open,
  onOpenChange,
}: {
  generationId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const supabase = createClient();
  const [gen, setGen] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !generationId) return;
    setLoading(true);
    supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .single()
      .then(({ data }) => {
        setGen(data);
        setLoading(false);
      });
  }, [open, generationId]);

  const violations = gen?.lawyer_result?.violations ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            {gen?.input_type === "video" ? "Video Check Result" : "Generated Video"}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}

        {!loading && gen && (
          <div className="space-y-4">
            {/* Video player */}
            {gen.output_video_url ? (
              <div className="bg-black rounded-xl overflow-hidden border border-zinc-800">
                <video
                  src={gen.output_video_url}
                  controls
                  autoPlay
                  className="w-full max-h-64"
                />
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-t border-zinc-800">
                  <span className="text-xs text-zinc-400">
                    {new Date(gen.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <a
                    href={`/api/download-video?url=${encodeURIComponent(gen.output_video_url)}&filename=helmet-${gen.id}.mp4`}
                    download={`helmet-${gen.id}.mp4`}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                No video available for this generation.
              </div>
            )}

            {/* Prompts */}
            {gen.original_prompt && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 font-medium mb-1.5">Original prompt</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{gen.original_prompt}</p>
              </div>
            )}

            {gen.modified_prompt && gen.modified_prompt !== gen.original_prompt && (
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-medium mb-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Compliant prompt used for generation
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">{gen.modified_prompt}</p>
              </div>
            )}

            {/* Violations */}
            {violations.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-amber-400 font-medium mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {violations.length} violation{violations.length !== 1 ? "s" : ""} were found and fixed
                </p>
                <div className="space-y-2">
                  {violations.map((v) => (
                    <div key={v.ruleCode} className="flex items-start gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 mt-0.5 ${severityColors[v.severity] ?? ""}`}>
                        {v.severity}
                      </span>
                      <div>
                        <p className="text-xs text-zinc-300 font-medium">{v.ruleTitle}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{v.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio explanation */}
            {gen.audio_explanation_url && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 font-medium mb-2 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Agent audio explanation
                </p>
                <audio src={gen.audio_explanation_url} controls className="w-full accent-blue-500 h-8" />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>{gen.tokens_spent} tokens spent</span>
              <span className="capitalize">{gen.status}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
