"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Loader2, Shield, AlertTriangle, CheckCircle, XCircle,
  Volume2, ThumbsUp, ThumbsDown, Film, ThumbsUp as Accept
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Step = "input" | "uploading" | "transcribing" | "checking" | "modifying" | "audio" | "done" | "compliant" | "error";

interface Violation {
  ruleCode: string;
  ruleTitle: string;
  severity: string;
  explanation: string;
  legalReference: string;
}

interface PlannerResult {
  modifiedPrompt: string;
  changes: Array<{ original: string; modified: string; reason: string; ruleCode: string }>;
  audioScript: string;
  contextPreservationScore: number;
}

export function UploadDialog({
  open, onOpenChange, tokensRemaining,
}: { open: boolean; onOpenChange: (v: boolean) => void; tokensRemaining: number }) {
  const router = useRouter();
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("input");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [transcript, setTranscript] = useState("");

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file (MP4 or WebM)"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Video must be under 500MB"); return; }
    setVideoFile(file);
  }

  function resetDialog() {
    setStep("input"); setVideoFile(null); setGenerationId(null); setViolations([]);
    setPlannerResult(null); setAudioUrl(null); setOutputVideoUrl(null); setErrorMessage(""); setTranscript("");
  }

  function handleClose() {
    if (["uploading", "transcribing", "checking", "modifying"].includes(step)) return;
    resetDialog();
    onOpenChange(false);
  }

  async function startCheck() {
    if (!videoFile) { toast.error("Please select a video file"); return; }
    if (tokensRemaining < 50) { toast.error("Insufficient tokens"); return; }

    setStep("uploading");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload video
      const path = `${user!.id}/${Date.now()}-${videoFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, videoFile);
      if (uploadErr) throw new Error("Video upload failed");
      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);

      // Create generation record
      const { data: gen, error: genErr } = await supabase.from("generations").insert({
        user_id: user!.id,
        input_type: "video",
        input_video_url: publicUrl,
        status: "checking",
      }).select().single();
      if (genErr) throw new Error(genErr.message);
      setGenerationId(gen.id);

      setStep("transcribing");

      // Transcribe
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: publicUrl, generationId: gen.id }),
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      setTranscript(transcribeData.combinedText);

      // Lawyer check
      await runLawyerCheck(gen.id, transcribeData.combinedText);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
      setStep("error");
    }
  }

  async function runLawyerCheck(genId: string, content: string) {
    setStep("checking");
    const res = await fetch("/api/lawyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, generationId: genId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Lawyer agent failed");

    if (result.isCompliant) {
      setStep("compliant");
      router.refresh();
    } else {
      setViolations(result.violations);
      await runPlannerStep(genId, content, result.violations);
    }
  }

  async function runPlannerStep(genId: string, content: string, viols: Violation[]) {
    setStep("modifying");
    const res = await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, violations: viols, generationId: genId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Planner agent failed");
    setPlannerResult(result);

    const audioRes = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: result.audioScript, generationId: genId }),
    });
    const audioData = await audioRes.json();
    if (audioRes.ok && audioData.audioUrl) setAudioUrl(audioData.audioUrl);

    setStep("audio");
  }

  async function handleApprove() {
    if (!generationId || !plannerResult) return;
    // For video check, generate a new compliant video from the modified prompt
    toast.info("Generating a compliant version of your video...");
    setStep("checking"); // reuse checking spinner

    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: plannerResult.modifiedPrompt, generationId }),
    });
    const data = await res.json();
    if (!res.ok) { setErrorMessage(data.error); setStep("error"); return; }
    setOutputVideoUrl(data.videoUrl);
    setStep("done");
    router.refresh();
  }

  async function handleReject() {
    if (!generationId || !plannerResult) return;
    toast.info("Re-checking modified content...");
    await runLawyerCheck(generationId, plannerResult.modifiedPrompt);
  }

  function severityColor(s: string) {
    const map: Record<string, string> = {
      CRITICAL: "text-red-400 bg-red-950/50 border-red-800",
      HIGH: "text-orange-400 bg-orange-950/50 border-orange-800",
      MEDIUM: "text-yellow-400 bg-yellow-950/50 border-yellow-800",
      LOW: "text-blue-400 bg-blue-950/50 border-blue-800",
    };
    return map[s] ?? "text-zinc-400 bg-zinc-800 border-zinc-700";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-400" /> Check Video Compliance
          </DialogTitle>
          <DialogDescription>
            Upload a video to check it against EU AI Act, GDPR, copyright, and content standards.
          </DialogDescription>
        </DialogHeader>

        {/* INPUT */}
        {step === "input" && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-violet-700 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            >
              <Film className="w-10 h-10 text-zinc-500" />
              {videoFile ? (
                <div className="text-center">
                  <p className="text-white font-medium">{videoFile.name}</p>
                  <p className="text-zinc-400 text-sm">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-zinc-300 font-medium">Click to upload video</p>
                  <p className="text-zinc-500 text-sm mt-1">MP4 or WebM, up to 500MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoChange} />
            </div>

            <div className="bg-zinc-800/50 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <Shield className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-zinc-400">
                Your video will be transcribed and analyzed against 30+ legal rules. If violations are found, you can accept a compliant modified version.
              </p>
            </div>

            <Button onClick={startCheck} className="w-full bg-violet-600 hover:bg-violet-700" disabled={!videoFile}>
              <Shield className="w-4 h-4 mr-2" /> Run Compliance Check
            </Button>
          </div>
        )}

        {/* LOADING */}
        {["uploading", "transcribing", "checking", "modifying"].includes(step) && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
            <div className="text-center">
              <div className="text-white font-medium text-lg">
                {step === "uploading" && "Uploading video..."}
                {step === "transcribing" && "Transcribing video..."}
                {step === "checking" && "Running legal compliance check..."}
                {step === "modifying" && "Finding compliant workarounds..."}
              </div>
              <div className="text-zinc-400 text-sm mt-1">
                {step === "transcribing" && "Converting audio to text for analysis"}
                {step === "checking" && "Checking against 30+ EU and international rules"}
              </div>
            </div>
          </div>
        )}

        {/* COMPLIANT */}
        {step === "compliant" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-white font-semibold text-xl">Video is Compliant!</div>
              <p className="text-zinc-400 text-sm text-center max-w-sm">
                Your video passed all legal checks. No violations were found against EU AI Act, GDPR, copyright law, or content safety standards.
              </p>
            </div>
            <Button onClick={() => { resetDialog(); onOpenChange(false); }} variant="success" className="w-full">Done</Button>
          </div>
        )}

        {/* AUDIO/REVIEW */}
        {step === "audio" && plannerResult && (
          <div className="space-y-4">
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-medium text-sm">{violations.length} violation{violations.length !== 1 ? "s" : ""} found</span>
              </div>
              <div className="space-y-2">
                {violations.slice(0, 4).map((v) => (
                  <div key={v.ruleCode} className="flex items-start gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 mt-0.5 ${severityColor(v.severity)}`}>
                      {v.severity}
                    </span>
                    <div>
                      <span className="text-xs text-zinc-300 font-medium">{v.ruleTitle}</span>
                      <p className="text-xs text-zinc-400 mt-0.5">{v.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {audioUrl && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-300 font-medium">Agent explanation (listen before deciding)</span>
                </div>
                <audio ref={audioRef} src={audioUrl} controls className="w-full h-8 accent-blue-500" />
              </div>
            )}

            <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3">
              <p className="text-xs text-zinc-400">
                <span className="text-emerald-400 font-medium">Proposed fix:</span> The planner will generate a new compliant video based on the modified prompt ({plannerResult.contextPreservationScore}% context preserved).
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleApprove} variant="success" className="flex-1">
                <ThumbsUp className="w-4 h-4 mr-2" /> Accept & Generate Compliant Video
              </Button>
              <Button onClick={handleReject} variant="outline" className="flex-1">
                <ThumbsDown className="w-4 h-4 mr-2" /> Request New Workaround
              </Button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === "done" && outputVideoUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle className="w-5 h-5" /> Compliant video generated!
            </div>
            <video src={outputVideoUrl} controls className="w-full rounded-xl border border-zinc-700 bg-black" />
            <div className="flex gap-3">
              <a href={outputVideoUrl} download className="flex-1">
                <Button variant="success" className="w-full">Download Video</Button>
              </a>
              <Button variant="outline" onClick={() => { resetDialog(); onOpenChange(false); router.refresh(); }}>Close</Button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-800 rounded-xl p-4">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium">Something went wrong</p>
                <p className="text-red-400/80 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
            <Button onClick={resetDialog} variant="outline" className="w-full">Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
