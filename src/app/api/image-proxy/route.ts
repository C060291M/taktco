import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

// Serves an image from object storage through this app's own origin.
//
// Photos live on cdn.taktco.org. A browser canvas cannot read pixels from a
// cross-origin image unless the CDN's CORS preflight cooperates, which in
// practice it does not - the same wall the flyer generator hit. Fetching the
// bytes here and re-serving them makes the image same-origin, so canvas
// operations (rotation) work with no CORS involved at all.
//
// Restricted to the configured storage host so this cannot be used as an open
// proxy to fetch arbitrary URLs, and requires a session so it is not public.
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Missing url." }, { status: 400 });

  const publicBase = process.env.STORAGE_PUBLIC_URL;
  if (!publicBase || !target.startsWith(publicBase)) {
    return NextResponse.json({ error: "That URL is not allowed." }, { status: 400 });
  }

  try {
    const upstream = await fetch(target);
    if (!upstream.ok) return NextResponse.json({ error: "Could not fetch image." }, { status: 502 });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=60"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch image." }, { status: 502 });
  }
}