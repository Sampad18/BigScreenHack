import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";

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
  const data = await runwareRequest([
    {
      taskType: "transcription",
      taskUUID: uuidv4(),
      model: "memories:1@1",
      inputs: { video: videoUrl },
    },
  ]);
  return data[0]?.text ?? "";
}

export async function captionImage(imageInput: string): Promise<string> {
  const data = await runwareRequest([
    {
      taskType: "caption",
      taskUUID: uuidv4(),
      model: "runware:151@1",
      inputImage: imageInput,
      prompt: "Describe this image in detail: subjects, setting, mood, colors, style, and notable elements.",
    },
  ]);
  return data[0]?.text ?? data[0]?.structuredData ?? "";
}

export interface VideoGenParams {
  prompt: string;
  width?: number;
  height?: number;
  duration?: number;
  model?: string;
}

// Video generation via Runware WebSocket API with async polling
export async function generateVideo(params: VideoGenParams): Promise<string> {
  const apiKey = process.env.RUNWARE_API_KEY!;
  const WS_URL = "wss://ws-api.runware.ai/v1";

  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { perMessageDeflate: false } as WebSocket.ClientOptions);
    let resolved = false;
    let videoTaskUUID: string | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const done = (url: string) => {
      if (resolved) return;
      resolved = true;
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      console.log("Runware video URL:", url);
      resolve(url);
    };

    const fail = (err: Error) => {
      if (resolved) return;
      resolved = true;
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      reject(err);
    };

    const timeout = setTimeout(() => {
      fail(new Error("Runware video generation timeout (300s)"));
    }, 300_000);

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

      console.log("Runware WS:", JSON.stringify(items));

      for (const item of items) {
        const obj = item as Record<string, unknown>;

        // Auth success — submit video inference task
        if (obj.taskType === "authentication" && !obj.error) {
          videoTaskUUID = uuidv4();
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

        // Initial ack from videoInference — start polling for completion
        if (obj.taskType === "videoInference" && obj.taskUUID === videoTaskUUID && !pollInterval) {
          pollInterval = setInterval(() => {
            send([{ taskType: "getResponse", taskUUID: videoTaskUUID }]);
          }, 2000);
          continue;
        }

        // Error handling
        if (obj.error || (Array.isArray(obj.errors) && (obj.errors as unknown[]).length)) {
          const errMsg = (obj.errorMessage as string) ?? JSON.stringify(obj.errors ?? obj.error);
          fail(new Error(`Runware error: ${errMsg}`));
          return;
        }

        // Poll result with status=success — extract video URL
        if (obj.status === "success") {
          const url =
            (obj.videoUUID as string) ??
            (obj.videoURL as string) ??
            (obj.videoUrl as string) ??
            (obj.url as string) ?? "";
          if (url) { done(url); return; }
        }

        // Direct response on videoInference taskUUID (sync fallback)
        if (obj.taskUUID === videoTaskUUID) {
          const url =
            (obj.videoUUID as string) ??
            (obj.videoURL as string) ??
            (obj.videoUrl as string) ??
            (obj.url as string) ?? "";
          if (url) { done(url); return; }
        }
      }
    });

    ws.on("error", (err: Error) => {
      fail(new Error(`Runware WebSocket error: ${err.message}`));
    });

    ws.on("close", (code: number) => {
      if (!resolved) {
        fail(new Error(`Runware WebSocket closed unexpectedly (code ${code})`));
      }
    });
  });
}
