// Extracts a representative brand color from an uploaded logo image, so a
// new company gets sensible branding the moment they upload their logo
// instead of having to manually pick a color. Runs entirely client-side via
// Canvas pixel sampling - no server round trip, no new dependency.
//
// Strategy: downsample the image onto a small canvas, then find the most
// common "vivid" color - skipping near-white/near-black/near-gray pixels
// (which are almost always background or line art, not the actual brand
// color) and weighting toward more saturated colors, since a logo's real
// brand color is usually the most colorful thing in it.
export function extractLogoColor(imageUrl: string): Promise<string | null> {
  return new Promise(function (resolve) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const buckets: Record<string, { count: number; r: number; g: number; b: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 200) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 2;
          const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));

          // Skip near-white, near-black, and low-saturation (gray) pixels -
          // these are almost always background or shading, not brand color.
          if (lightness > 235 || lightness < 25 || saturation < 0.15) continue;

          const bucketKey = Math.round(r / 24) + "," + Math.round(g / 24) + "," + Math.round(b / 24);
          if (!buckets[bucketKey]) buckets[bucketKey] = { count: 0, r: 0, g: 0, b: 0 };
          buckets[bucketKey].count += 1;
          buckets[bucketKey].r += r;
          buckets[bucketKey].g += g;
          buckets[bucketKey].b += b;
        }

        const winner = Object.values(buckets).sort(function (a, b) { return b.count - a.count; })[0];
        if (!winner) {
          resolve(null);
          return;
        }

        const r = Math.round(winner.r / winner.count);
        const g = Math.round(winner.g / winner.count);
        const b = Math.round(winner.b / winner.count);
        const hex = "#" + [r, g, b].map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
        resolve(hex);
      } catch {
        resolve(null);
      }
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = imageUrl;
  });
}
