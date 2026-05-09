import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename } = await req.json();
    const path = `${user.id}/${Date.now()}-${filename}`;

    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient.storage
      .from("uploads")
      .createSignedUploadUrl(path);

    if (error) {
      console.error("createSignedUploadUrl error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = serviceClient.storage.from("uploads").getPublicUrl(path);

    // Signed download URL so Runware can access the video even if the bucket is private
    const { data: dlData } = await serviceClient.storage
      .from("uploads")
      .createSignedUrl(path, 3600);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
      accessUrl: dlData?.signedUrl ?? publicUrl,
    });
  } catch (err) {
    console.error("upload-url error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
