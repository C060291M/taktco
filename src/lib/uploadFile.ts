// Client-side upload helper. Tries real object storage (presigned R2/S3 upload)
// first; if storage isn't configured (501 from the presign endpoint) or the
// request fails for any reason, falls back to the original base64-in-database
// approach so every upload flow keeps working with zero configuration.
//
// This is the one place that decides "real storage vs base64" - individual
// upload components (LogoDropzone, DocumentDropzone, JobPhotoUploader) just
// call this and get a URL back either way.
export async function uploadFileSmart(
  file: File,
  kind: "logos" | "job-photos" | "contracts" | "documents"
): Promise<string> {
  try {
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, fileName: file.name, contentType: file.type })
    });

    if (presignRes.ok) {
      const { uploadUrl, publicUrl } = await presignRes.json();
      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
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
    reader.readAsDataURL(file);
  });
}
