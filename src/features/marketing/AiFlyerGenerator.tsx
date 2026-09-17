"use client";
import { useState, useRef } from "react";

// Renders the AI's self-designed HTML document into a hidden off-screen
// iframe - not a div. The route returns a FULL document (its own
// <html>/<head>/<style>/<body>), and injecting that via
// dangerouslySetInnerHTML into a div silently drops the <html>/<head>/<body>
// wrapper tags during fragment parsing. That broke the flyer's own
// `body{width:850px;height:1100px;background:var(--canvas);overflow:hidden}`
// rule, which ended up targeting the REAL page's <body> instead of the
// flyer content - leaving the actual rendered container with no enforced
// size or background. That's why text rendered pale (no dark canvas behind
// ink-colored text, so html2canvas's white fallback showed through) and
// content overflowed past the page edge. An iframe has its own real
// document, so :root and body{} selectors apply exactly as the server
// authored them. Sandboxed to allow-same-origin only (no allow-scripts) -
// unlike a div, an iframe will actually execute a <script> tag if the model
// ever outputs one, so this blocks that without breaking html2canvas's
// same-origin access to the iframe's contentDocument.
export function AiFlyerGenerator({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function waitForImages(doc: Document) {
    const imgs = Array.from(doc.querySelectorAll("img"));
    await Promise.all(
      imgs.map(function (img) {
        if ((img as HTMLImageElement).complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.addEventListener("load", resolve);
          img.addEventListener("error", resolve);
        });
      })
    );
  }

  function waitForIframeLoad(iframe: HTMLIFrameElement) {
    return new Promise<void>(function (resolve) {
      iframe.onload = function () { resolve(); };
    });
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/ai-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      setPreviewHtml(data.html);

      const iframe = iframeRef.current;
      if (!iframe) {
        setError("Couldn't render the preview.");
        setLoading(false);
        return;
      }

      const loaded = waitForIframeLoad(iframe);
      iframe.srcdoc = data.html;
      await loaded;

      const doc = iframe.contentDocument;
      if (!doc || !doc.body) {
        setError("Couldn't render the preview.");
        setLoading(false);
        return;
      }

      await waitForImages(doc);

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(doc.body, { useCORS: true, scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [850, 1100] });
      pdf.addImage(imgData, "PNG", 0, 0, 850, 1100);
      pdf.save("ai-flyer.pdf");
    } catch {
      setError("AI flyer generation failed. Try the standard flyer instead.");
    }
    setLoading(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-medium text-white">AI-Designed Flyer</h2>
          <p className="text-xs text-graphite-400 mt-1">TAKTCO AI designs a unique flyer from scratch - layout, colors, and copy, built around your logo and photos.</p>
        </div>
        <button className="btn-primary text-sm shrink-0" disabled={loading} onClick={generate}>
          {loading ? "Designing..." : "Generate AI Flyer"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {/* Off-screen render target - a real iframe document, not a div, so the
          flyer's own <html>/<head>/<style>/<body> (including its body{}
          sizing/background rule and :root CSS variables) apply exactly as
          the server authored them. Positioned far off canvas rather than
          display:none, since some browsers won't correctly rasterize a
          display:none element. */}
      <iframe
        ref={iframeRef}
        title="AI flyer render target"
        sandbox="allow-same-origin"
        style={{ position: "fixed", top: 0, left: "-9999px", width: "850px", height: "1100px", border: "none" }}
      />
    </div>
  );
}