// Client-side upload helper. Tries real object storage (presigned R2/S3 upload)
// first; if storage isn't configured (501 from the presign endpoint) or the
// request fails for any reason, falls back to the original base64-in-database
// approach so every upload flow keeps working with zero configuration.
//
// This is the one place that decides "real storage vs base64" - individual
// upload components (LogoDropzone, DocumentDropzone, JobPhotoUploader) just
// call this and get a URL back either way.
//
// Before any of that, image files are re-encoded through a canvas using the
// browser's native createImageBitmap({imageOrientation: "from-image"}) - this
// bakes in the correct rotation from the photo's EXIF orientation tag (phones
// don't physically rotate pixels, just tag "rotate me 90deg" and let the
// viewer handle it). Without this, sideways/upside-down photos from phones
// render sideways everywhere downstream: the web app, PDFs, flyers. Pure
// browser API, no new dependency, runs before the file ever leaves the device.
async function fixImageOrientation(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, file.type || "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type || "image/jpeg" });
  } catch {
    // If orientation correction fails for any reason, upload the original
    // rather than blocking the upload entirely.
    return file;
  }
}

export async function uploadFileSmart(
  file: File,
  kind: "logos" | "job-photos" | "contracts" | "documents"
): Promise<string> {
  const correctedFile = await fixImageOrientation(file);

  try {
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, fileName: correctedFile.name, contentType: correctedFile.type })
    });
    if (presignRes.ok) {
      const { uploadUrl, publicUrl } = await presignRes.json();
      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": correctedFile.type }, body: correctedFile });
      if (putRes.ok && publicUrl) return publicUrl;
    }
  } catch {
    // fall through to base64 below
  }
  // Fallback: base64 data URL, same as before storage was wired up.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(correctedFile);
  });
}
