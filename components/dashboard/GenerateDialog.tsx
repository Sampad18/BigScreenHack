"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Film, Image as ImageIcon, Loader2, Shield, AlertTriangle,
  CheckCircle, XCircle, ThumbsUp, ThumbsDown, X, Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Step = "input" | "transcribing" | "checking" | "modifying" | "audio" | "generating" | "done" | "error";

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

export function GenerateDialog({
  open, onOpenChange, tokensRemaining,
}: { open: boolean; onOpenChange: (v: boolean) => void; tokensRemaining: number }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("input");
  const [statusMsg, setStatusMsg] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCompliant, setIsCompliant] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  // Autoplay audio as soon as it's ready — no visible player
  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
    return () => { audio.pause(); };
  }, [audioUrl]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function resetDialog() {
    setStep("input"); setStatusMsg(""); setPrompt(""); setImageFile(null); setImagePreview(null);
    setGenerationId(null); setViolations([]); setPlannerResult(null);
    setAudioUrl(null); setVideoUrl(null); setErrorMessage(""); setIsCompliant(false); setLoopCount(0);
  }

  function handleClose() {
    resetDialog();
    onOpenChange(false);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function startGeneration() {
    if (!prompt.trim()) { toast.error("Please enter a video description"); return; }
    if (tokensRemaining < 100) { toast.error("Insufficient tokens (need at least 100 for check + generation)"); return; }

    setStep("transcribing");
    setStatusMsg("Preparing your input...");

    try {
      let imageBase64: string | undefined;
      if (imageFile) {
        setStatusMsg("Converting image to base64...");
        imageBase64 = await fileToBase64(imageFile);
      }

      setStatusMsg("Creating generation record...");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: gen, error: genErr } = await supabase.from("generations").insert({
        user_id: user!.id,
        input_type: imageFile ? "text_image" : "text",
        original_prompt: prompt,
        status: "checking",
      }).select().single();
      if (genErr) throw new Error(genErr.message);
      setGenerationId(gen.id);

      setStatusMsg(imageBase64 ? "Analyzing image with Runware Caption API..." : "Processing text input...");
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt, imageBase64, generationId: gen.id }),
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error ?? "Transcription failed");

      await runLawyerCheck(gen.id, transcribeData.combinedText, 0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
      setStep("error");
    }
  }

  async function runLawyerCheck(genId: string, content: string, iteration: number) {
    setStep("checking");
    setLoopCount(iteration);
    setStatusMsg(iteration === 0 ? "Loading rules from database..." : `Re-checking modified prompt (round ${iteration + 1})...`);

    const res = await fetch("/api/lawyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, generationId: genId }),
    });
    setStatusMsg("Running DeepSeek legal compliance check against 25+ rules...");
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Lawyer agent failed");

    if (result.isCompliant) {
      setIsCompliant(true);
      setStatusMsg("Content is compliant! Starting video generation...");
      fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, generationId: genId }),
      }).then((r) => r.json()).then((d) => { if (d.audioUrl) setAudioUrl(d.audioUrl); }).catch(() => {});
      await generateVideo(genId, content);
    } else {
      setViolations(result.violations);
      await runPlannerStep(genId, content, result.violations);
    }
  }

  async function runPlannerStep(genId: string, content: string, viols: Violation[]) {
    setStep("modifying");
    setStatusMsg(`Found ${viols.length} violation(s). DeepSeek planner finding workarounds...`);
    const res = await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, violations: viols, generationId: genId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Planner agent failed");

    setPlannerResult(result);

    setStatusMsg("Generating ElevenLabs audio explanation...");
    const audioRes = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        violations: viols,
        modifiedPrompt: result.modifiedPrompt,
        generationId: genId,
      }),
    });
    const audioData = await audioRes.json();
    if (audioRes.ok && audioData.audioUrl) {
      setAudioUrl(audioData.audioUrl);
    }
    setStep("audio");
  }

  async function handleApprove() {
    if (!generationId || !plannerResult) return;
    setStep("generating");
    await generateVideo(generationId, plannerResult.modifiedPrompt);
  }

  async function handleReject() {
    if (!generationId || !plannerResult) return;
    toast.info("Starting another compliance loop...");
    await runLawyerCheck(generationId, plannerResult.modifiedPrompt, loopCount + 1);
  }

  async function generateVideo(genId: string, finalPrompt: string) {
    setStep("generating");
    setStatusMsg("Submitting to Runware Seedance 2.0 Fast...");

    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt, generationId: genId }),
    });
    const submitResult = await res.json();
    if (!res.ok) throw new Error(submitResult.error ?? "Video submission failed");

    const { taskUUID } = submitResult;
    setStatusMsg("Video is rendering... this takes 2–4 minutes. Please keep this tab open.");

    // Poll every 8 seconds until done (up to 6 minutes)
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 8000));
      const pollRes = await fetch(`/api/poll-video?taskUUID=${taskUUID}&generationId=${genId}`);
      const pollData = await pollRes.json();

      if (pollData.status === "completed" && pollData.videoUrl) {
        setVideoUrl(pollData.videoUrl);
        setStep("done");
        router.refresh();
        return;
      }
      if (pollData.status === "failed") {
        throw new Error(pollData.error ?? "Runware video generation failed");
      }

      const elapsed = Math.round(((i + 1) * 8) / 60);
      setStatusMsg(`Rendering in progress... (~${elapsed} min elapsed, keep this tab open)`);
    }

    throw new Error("Video generation timed out after 6 minutes");
  }

  const stepLabels: Record<Step, string> = {
    input: "Input", transcribing: "Analyzing", checking: "Legal Check",
    modifying: "Modifying", audio: "Review", generating: "Generating", done: "Done", error: "Error",
  };

  const steps: Step[] = ["input", "transcribing", "checking", "modifying", "audio", "generating", "done"];
  const currentStepIdx = steps.indexOf(step);

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
            <Film className="w-5 h-5 text-[#6FFF00]" /> Generate Compliant Video
          </DialogTitle>
          <DialogDescription>
            Describe your video — our agents will ensure it meets all legal requirements.
          </DialogDescription>
        </DialogHeader>

        {/* Step progress */}
        {step !== "input" && (
          <div className="flex items-center gap-1 mb-2">
            {["Analyzing", "Legal Check", "Modifying", "Review", "Generating"].map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-all ${
                  i + 1 <= currentStepIdx - 1 ? "bg-[#6FFF00]" :
                  i + 1 === currentStepIdx - 1 ? "bg-[#6FFF00]" : "bg-white/10"
                }`} />
              </div>
            ))}
          </div>
        )}

        {/* INPUT STEP */}
        {step === "input" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-mono uppercase tracking-wider text-[#EFF4FF]/70 mb-2">Video description *</label>
              <textarea
                className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#EFF4FF] placeholder:text-[#EFF4FF]/30 focus:outline-none focus:ring-2 focus:ring-[#6FFF00]/40 resize-none transition-all"
                placeholder="Describe the video you want to create. Be specific about scenes, characters, tone, and style..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="text-xs text-[#EFF4FF]/30 mt-1 font-mono">{prompt.length} characters</p>
            </div>

            <div>
              <label className="block text-sm font-mono uppercase tracking-wider text-[#EFF4FF]/70 mb-2">Reference image (optional)</label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-32 rounded-lg border border-white/10 object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-3 border-2 border-dashed border-white/10 hover:border-[#6FFF00]/40 rounded-lg px-4 py-4 cursor-pointer transition-colors">
                  <ImageIcon className="w-5 h-5 text-[#EFF4FF]/40" />
                  <span className="text-sm text-[#EFF4FF]/40 font-mono">Click to upload image (JPG, PNG, WebP)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="bg-white/5 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#6FFF00] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#EFF4FF]/50 font-mono">
                Your content will be checked against EU AI Act, GDPR, copyright law, and international content standards before generation. This costs 50 tokens per check + 50 tokens for the final video.
              </p>
            </div>

            <Button onClick={startGeneration} className="w-full" disabled={!prompt.trim()}>
              <Sparkles className="w-4 h-4 mr-2" /> Start Compliance Check & Generate
            </Button>
          </div>
        )}

        {/* LOADING STEPS */}
        {(step === "transcribing" || step === "checking" || step === "modifying" || step === "generating") && (
          <div className="flex flex-col items-center py-10 gap-5">
            <div className="w-16 h-16 bg-[#6FFF00]/10 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#6FFF00] animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-[#EFF4FF] font-grotesk uppercase tracking-wide text-lg">
                {step === "transcribing" && "Analyzing input"}
                {step === "checking" && "Legal compliance check"}
                {step === "modifying" && "Finding workarounds"}
                {step === "generating" && "Generating video"}
              </div>
              <div className="text-[#6FFF00] text-sm font-mono bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-lg px-4 py-2 mt-2">
                ▶ {statusMsg}
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-[#EFF4FF]/40 font-mono mb-1">
                {["Analyze", "Legal Check", "Modify", "Generate"].map((label, i) => (
                  <span key={label} className={
                    (step === "transcribing" && i === 0) ||
                    (step === "checking" && i === 1) ||
                    (step === "modifying" && i === 2) ||
                    (step === "generating" && i === 3)
                      ? "text-[#6FFF00]" : ""
                  }>{label}</span>
                ))}
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#6FFF00] rounded-full transition-all duration-500" style={{
                  width: step === "transcribing" ? "15%" : step === "checking" ? "40%" : step === "modifying" ? "65%" : "85%"
                }} />
              </div>
            </div>
          </div>
        )}

        {/* AUDIO/REVIEW STEP */}
        {step === "audio" && plannerResult && (
          <div className="space-y-4">
            <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-mono text-sm uppercase tracking-wide">{violations.length} violation{violations.length !== 1 ? "s" : ""} found</span>
              </div>
              <div className="space-y-2">
                {violations.slice(0, 3).map((v) => (
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
                {violations.length > 3 && (
                  <p className="text-xs text-[#EFF4FF]/30 font-mono">+{violations.length - 3} more violations</p>
                )}
              </div>
            </div>

            <div className="bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-[#6FFF00]" />
                <span className="text-[#6FFF00] font-mono text-sm uppercase tracking-wide">Modified prompt ready</span>
                <span className="ml-auto text-xs text-[#6FFF00]/70 font-mono">{plannerResult.contextPreservationScore}% context preserved</span>
              </div>
              <p className="text-xs text-[#EFF4FF]/70 bg-white/5 rounded-lg p-3 leading-relaxed border border-white/10 font-mono">
                {plannerResult.modifiedPrompt}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleApprove} variant="success" className="flex-1">
                <ThumbsUp className="w-4 h-4 mr-2" /> Accept Changes & Generate
              </Button>
              <Button onClick={handleReject} variant="outline" className="flex-1">
                <ThumbsDown className="w-4 h-4 mr-2" /> Request New Workaround
              </Button>
            </div>
          </div>
        )}

        {/* DONE STEP */}
        {step === "done" && videoUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#6FFF00] font-grotesk uppercase tracking-wide text-lg">
              <CheckCircle className="w-6 h-6" /> Video ready!
            </div>
            <div className="bg-black rounded-xl overflow-hidden border border-white/10">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full max-h-72"
              />
            </div>
            <div className="flex gap-3">
              <a href={`/api/download-video?url=${encodeURIComponent(videoUrl)}&filename=helmet-video.mp4`} download="helmet-video.mp4" className="flex-1">
                <Button variant="success" className="w-full">
                  Download Video
                </Button>
              </a>
              <Button variant="outline" onClick={() => { resetDialog(); onOpenChange(false); router.refresh(); }}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* ERROR STEP */}
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
