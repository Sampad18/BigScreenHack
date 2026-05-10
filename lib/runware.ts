import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { RunwareServer } from "@runware/sdk-js";

// HTTP REST — used for transcription and captioning (synchronous)
const RUNWARE_API = "https://api.runware.ai/v1";

async function runwareRequest(tasks: object[]) {
  const res = await fetch(RUNWARE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RUNWARE_API_KEY}`,
    },
    body: JSON.stringify(tasks),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Runware API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function transcribeVideo(videoUrl: string): Promise<string> {
  const taskUUID = uuidv4();

  // Submit transcription task via HTTP
  const submitData = await runwareRequest([{
    taskType: "audioTranscription",
    taskUUID,
    model: "openai:whisper-large-v3",
    inputAudio: videoUrl,
    deliveryMethod: "async",
  }]);
  console.log("Transcription submitted:", JSON.stringify(submitData));

  // Poll via HTTP every 4 seconds for up to 3 minutes
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 45; i++) {
    await sleep(4000);
    try {
      const pollData = await runwareRequest([{
        taskType: "getResponse",
        taskUUID,
      }]);
      console.log("Transcription poll:", JSON.stringify(pollData));
      if (Array.isArray(pollData) && pollData.length > 0) {
        const result = pollData[0] as Record<string, unknown>;
        if (result.status === "success") {
          return (result.text as string) ?? (result.transcript as string) ?? "";
        }
        if (result.status === "failed" || result.error) {
          throw new Error((result.errorMessage as string) ?? "Transcription failed on Runware");
        }
      }
    } catch (e) {
      console.warn("Poll attempt failed:", e);
    }
  }

  throw new Error("Transcription timeout after 3 minutes");
}

// Transcribe a video's audio via Runware WebSocket (Whisper).
export async function transcribeVideoUrl(videoUrl: string): Promise<string> {
  const apiKey = process.env.RUNWARE_API_KEY!;
  const WS_URL = "wss://ws-api.runware.ai/v1";
  const taskUUID = uuidv4();

  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { perMessageDeflate: false } as WebSocket.ClientOptions);
    let settled = false;

    const done = (text: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      resolve(text);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      reject(err);
    };

    const timeout = setTimeout(() => fail(new Error("Transcription timeout (120s)")), 120_000);

    const send = (payload: object[]) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    };

    ws.on("open", () => {
      send([{ taskType: "authentication", apiKey }]);
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      let items: unknown[];
      try {
        const parsed = JSON.parse(raw.toString());
        items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
      } catch { return; }

      for (const item of items) {
        const obj = item as Record<string, unknown>;

        if (obj.error || (Array.isArray(obj.errors) && (obj.errors as unknown[]).length)) {
          fail(new Error((obj.errorMessage as string) ?? JSON.stringify(obj.errors ?? obj.error)));
          return;
        }

        if (obj.taskType === "authentication" && !obj.error) {
          send([{
            taskType: "audioTranscription",
            taskUUID,
            model: "openai:whisper-large-v3",
            inputAudio: videoUrl,
          }]);
          continue;
        }

        if (obj.taskUUID === taskUUID) {
          const text = (obj.text ?? obj.transcript ?? "") as string;
          done(text);
          return;
        }
      }
    });

    ws.on("error", (err: Error) => fail(new Error(`Runware WS error: ${err.message}`)));
    ws.on("close", (code: number) => { if (!settled) fail(new Error(`Runware WS closed (${code})`)); });
  });
}

export interface VideoGenParams {
  prompt: string;
  width?: number;
  height?: number;
  duration?: number;
  model?: string;
}

// Submit video job via WebSocket — returns taskUUID immediately after acknowledgment.
// Does NOT wait for the video to render (that can take 2-5 minutes).
export async function submitVideoJob(params: VideoGenParams): Promise<string> {
  const apiKey = process.env.RUNWARE_API_KEY!;
  const WS_URL = "wss://ws-api.runware.ai/v1";
  const videoTaskUUID = uuidv4();

  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { perMessageDeflate: false } as WebSocket.ClientOptions);
    let settled = false;

    const done = (uuid: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      resolve(uuid);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      reject(err);
    };

    const timeout = setTimeout(() => {
      fail(new Error("Runware submission timeout (30s)"));
    }, 30_000);

    const send = (tasks: object[]) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(tasks));
    };

    ws.on("open", () => {
      send([{ taskType: "authentication", apiKey }]);
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      let items: unknown[];
      try {
        const parsed = JSON.parse(raw.toString());
        items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
      } catch { return; }

      for (const item of items) {
        const obj = item as Record<string, unknown>;

        if (obj.error || (Array.isArray(obj.errors) && (obj.errors as unknown[]).length)) {
          fail(new Error((obj.errorMessage as string) ?? "Runware submission error"));
          return;
        }

        if (obj.taskType === "authentication" && !obj.error) {
          send([{
            taskType: "videoInference",
            taskUUID: videoTaskUUID,
            positivePrompt: params.prompt,
            model: params.model ?? "bytedance:seedance@2.0-fast",
            width: params.width ?? 1280,
            height: params.height ?? 720,
            duration: params.duration ?? 5,
            outputFormat: "MP4",
            numberResults: 1,
            deliveryMethod: "async",
          }]);
          continue;
        }

        // Acknowledgment received — job is queued, return taskUUID
        if (obj.taskType === "videoInference" && obj.taskUUID === videoTaskUUID) {
          done(videoTaskUUID);
          return;
        }
      }
    });

    ws.on("error", (err: Error) => {
      fail(new Error(`Runware WebSocket error: ${err.message}`));
    });

    ws.on("close", (code: number) => {
      if (!settled) fail(new Error(`Runware WebSocket closed unexpectedly (code ${code})`));
    });
  });
}

// Poll for a submitted video job via REST — call this every few seconds from the client.
export async function pollVideoJob(taskUUID: string): Promise<{ status: "pending" | "completed" | "failed"; videoUrl?: string; error?: string }> {
  let data: Record<string, unknown>[];
  try {
    data = await runwareRequest([{ taskType: "getResponse", taskUUID }]);
  } catch {
    return { status: "pending" };
  }

  if (!Array.isArray(data) || data.length === 0) return { status: "pending" };

  const result = data[0] as Record<string, unknown>;

  if (result.status === "success") {
    const videoUrl = (result.videoURL ?? result.videoUrl ?? result.url) as string | undefined;
    if (videoUrl) return { status: "completed", videoUrl };
  }

  if (result.status === "failed" || result.error) {
    return { status: "failed", error: (result.errorMessage as string) ?? "Runware generation failed" };
  }

  return { status: "pending" };
}
