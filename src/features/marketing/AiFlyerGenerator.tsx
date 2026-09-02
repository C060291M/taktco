"use client";
import { useState, useRef } from "react";

// Renders the AI's self-designed HTML flyer into a hidden off-screen
// container, waits for every image inside it to actually finish loading
// (critical - html2canvas captures whatever's in the DOM at the moment it
// runs, so a not-yet-loaded photo would just be blank), then rasterizes
// that container with html2canvas and wraps the result in a downloadable
// PDF via jsPDF. Everything happens in the browser - no server-side
// headless browser, so no Puppeteer-style deployment risk.
export function AiFlyerGenerator({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function waitForImages(container: HTMLElement) {
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
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

      // Wait a tick for the iframe/container to actually mount the new HTML.
      await new Promise(function (resolve) { setTimeout(resolve, 100); });

      const container = containerRef.current;
      if (!container) {
        setError("Couldn't render the preview.");
        setLoading(false);
        return;
      }

      await waitForImages(container);

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(container, { useCORS: true, scale: 2, backgroundColor: "#ffffff" });
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

      {/* Off-screen render target - positioned far off canvas rather than display:none,
          since some browsers won't correctly rasterize a display:none element. */}
      <div style={{ position: "fixed", top: 0, left: "-9999px", width: "850px", height: "1100px" }}>
        <div ref={containerRef} dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
      </div>
    </div>
  );
}
