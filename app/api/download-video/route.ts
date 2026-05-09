import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") ?? "helmet-video.mp4";

  if (!url || !url.startsWith("https://")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Only proxy Runware CDN URLs
  const allowed = ["im.runware.ai", "vm.runware.ai", "cdn.runware.ai"];
  const hostname = new URL(url).hostname;
  if (!allowed.some((h) => hostname === h || hostname.endsWith("." + h))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) return new NextResponse("Video fetch failed", { status: 502 });

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
