"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Loader2, Shield, AlertTriangle, CheckCircle, XCircle,
  ThumbsUp, ThumbsDown, Film
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

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
    return () => { audio.pause(); };
  }, [audioUrl]);

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file (MP4 or WebM)"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Video must be under 500MB"); return; }
    setVideoFile(file);
  }

  async function extractVideoFrames(file: File, count = 4): Promise<string[]> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.muted = true;
      video.crossOrigin = "anonymous";

      video.addEventListener("loadedmetadata", async () => {
        const duration = video.duration || 10;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const frames: string[] = [];

        for (let i = 0; i < count; i++) {
          await new Promise<void>((res) => {
            video.currentTime = (duration / (count + 1)) * (i + 1);
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              const maxW = 640;
              const scale = Math.min(1, maxW / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL("image/jpeg", 0.75));
              res();
            };
            video.addEventListener("seeked", onSeeked);
          });
        }

        URL.revokeObjectURL(objectUrl);
        resolve(frames);
      });

      video.addEventListener("error", () => {
        URL.revokeObjectURL(objectUrl);
        resolve([]);
      });

      video.load();
    });
  }

  function resetDialog() {
    setStep("input"); setVideoFile(null); setGenerationId(null); setViolations([]);
    setPlannerResult(null); setAudioUrl(null); setOutputVideoUrl(null); setErrorMessage(""); setTranscript("");
  }

  function handleClose() {
    resetDialog();
    onOpenChange(false);
  }

  async function startCheck() {
    if (!videoFile) { toast.error("Please select a video file"); return; }
    if (tokensRemaining < 50) { toast.error("Insufficient tokens"); return; }

    setStep("uploading");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get signed upload URL from server (bypasses RLS)
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: videoFile.name }),
      });
      if (!urlRes.ok) {
        const urlErr = await urlRes.json();
        throw new Error("Upload URL error: " + (urlErr.error ?? urlRes.status));
      }
      const { signedUrl, token, path, publicUrl } = await urlRes.json();

      // Upload directly to Supabase using signed URL
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .uploadToSignedUrl(path, token, videoFile, { contentType: videoFile.type });
      if (uploadErr) throw new Error("Video upload failed: " + uploadErr.message);

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

      // Send uploaded video URL to Runware video-to-text model
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: publicUrl, generationId: gen.id }),
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error ?? "Video analysis failed");
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
      fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, generationId: genId }),
      }).then((r) => r.json()).then((d) => { if (d.audioUrl) setAudioUrl(d.audioUrl); }).catch(() => {});
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
      body: JSON.stringify({ violations: viols, generationId: genId }),
    });
    const audioData = await audioRes.json();
    if (audioRes.ok && audioData.audioUrl) setAudioUrl(audioData.audioUrl);

    setStep("audio");
  }

  async function handleApprove() {
    if (!generationId || !plannerResult) return;
    toast.info("Submitting compliant video for generation...");
    setStep("checking");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: plannerResult.modifiedPrompt, generationId }),
      });
      const submitData = await res.json();
      if (!res.ok) { setErrorMessage(submitData.error); setStep("error"); return; }

      const { taskUUID } = submitData;

      // Poll every 8 seconds until done (up to 6 minutes)
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        const pollRes = await fetch(`/api/poll-video?taskUUID=${taskUUID}&generationId=${generationId}`);
        const pollData = await pollRes.json();

        if (pollData.status === "completed" && pollData.videoUrl) {
          setOutputVideoUrl(pollData.videoUrl);
          setStep("done");
          router.refresh();
          return;
        }
        if (pollData.status === "failed") {
          setErrorMessage(pollData.error ?? "Runware video generation failed");
          setStep("error");
          return;
        }
      }

      setErrorMessage("Video generation timed out after 6 minutes");
      setStep("error");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
      setStep("error");
    }
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
      LOW: "text-[#6FFF00] bg-[#6FFF00]/10 border-[#6FFF00]/30",
    };
    return map[s] ?? "text-[#EFF4FF]/60 bg-white/5 border-white/10";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-grotesk uppercase tracking-wide">
            <Upload className="w-5 h-5 text-[#6FFF00]" /> Check Video Compliance
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
              className="border-2 border-dashed border-white/10 hover:border-[#6FFF00]/40 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            >
              <Film className="w-10 h-10 text-[#EFF4FF]/30" />
              {videoFile ? (
                <div className="text-center">
                  <p className="text-[#EFF4FF] font-medium">{videoFile.name}</p>
                  <p className="text-[#EFF4FF]/40 text-sm font-mono">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[#EFF4FF]/70 font-mono uppercase tracking-wider text-sm">Click to upload video</p>
                  <p className="text-[#EFF4FF]/30 text-xs mt-1 font-mono">MP4 or WebM, up to 500MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoChange} />
            </div>

            <div className="bg-white/5 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#6FFF00] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#EFF4FF]/50 font-mono">
                Your video will be analyzed visually across key frames and checked against 30+ legal rules. If violations are found, you can accept a compliant modified version.
              </p>
            </div>

            <Button onClick={startCheck} className="w-full" disabled={!videoFile}>
              <Shield className="w-4 h-4 mr-2" /> Run Compliance Check
            </Button>
          </div>
        )}

        {/* LOADING */}
        {["uploading", "transcribing", "checking", "modifying"].includes(step) && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 bg-[#6FFF00]/10 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#6FFF00] animate-spin" />
            </div>
            <div className="text-center">
              <div className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-lg">
                {step === "uploading" && "Uploading video..."}
                {step === "transcribing" && "Analyzing video content..."}
                {step === "checking" && "Running legal compliance check..."}
                {step === "modifying" && "Finding compliant workarounds..."}
              </div>
              <div className="text-[#EFF4FF]/40 font-mono text-sm mt-1">
                {step === "transcribing" && "AI is watching key frames of your video"}
                {step === "checking" && "Checking against 30+ EU and international rules"}
              </div>
            </div>
          </div>
        )}

        {/* COMPLIANT */}
        {step === "compliant" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 bg-[#6FFF00]/10 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#6FFF00]" />
              </div>
              <div className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-xl">Video is Compliant!</div>
              <p className="text-[#EFF4FF]/50 font-mono text-sm text-center max-w-sm">
                Your video passed all legal checks. No violations were found against EU AI Act, GDPR, copyright law, or content safety standards.
              </p>
            </div>
            <Button onClick={() => { resetDialog(); onOpenChange(false); }} variant="success" className="w-full">Done</Button>
          </div>
        )}

        {/* AUDIO/REVIEW */}
        {step === "audio" && plannerResult && (
          <div className="space-y-4">
            <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-mono uppercase tracking-wide text-sm">{violations.length} violation{violations.length !== 1 ? "s" : ""} found</span>
              </div>
              <div className="space-y-2">
                {violations.slice(0, 4).map((v) => (
                  <div key={v.ruleCode} className="flex items-start gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 mt-0.5 ${severityColor(v.severity)}`}>
                      {v.severity}
                    </span>
                    <div>
                      <span className="text-xs text-[#EFF4FF]/80 font-medium">{v.ruleTitle}</span>
                      <p className="text-xs text-[#EFF4FF]/50 mt-0.5 font-mono">{v.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-xl p-3">
              <p className="text-xs text-[#EFF4FF]/50 font-mono">
                <span className="text-[#6FFF00] font-medium">Proposed fix:</span> The planner will generate a new compliant video based on the modified prompt ({plannerResult.contextPreservationScore}% context preserved).
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
            <div className="flex items-center gap-2 text-[#6FFF00] font-grotesk uppercase tracking-wide">
              <CheckCircle className="w-5 h-5" /> Compliant video generated!
            </div>
            <video src={outputVideoUrl} controls className="w-full rounded-xl border border-white/10 bg-black" />
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
            <div className="flex items-start gap-3 bg-red-950/20 border border-red-800/40 rounded-xl p-4">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-mono uppercase tracking-wide text-sm">Something went wrong</p>
                <p className="text-red-400/80 text-sm mt-1 font-mono">{errorMessage}</p>
              </div>
            </div>
            <Button onClick={resetDialog} variant="outline" className="w-full">Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
