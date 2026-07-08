function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales an image to fit within maxDimension and compresses it to fit under
 * maxDataUrlLength (a data-URI string length budget). Tries lossless PNG first
 * (keeps transparency); if that doesn't fit, falls back to a white-background
 * JPEG at decreasing quality. Returns null if no attempt fits the budget.
 */
export async function compressImageToDataUrl(
  file: File,
  options: { maxDimension: number; maxDataUrlLength: number },
): Promise<string | null> {
  const original = await readFileAsDataUrl(file);
  const img = await loadImage(original);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const { maxDimension, maxDataUrlLength } = options;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const png = canvas.toDataURL("image/png");
  if (png.length <= maxDataUrlLength) return png;

  // PNG didn't fit — flatten onto white and re-encode as JPEG at decreasing quality.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  for (let quality = 0.92; quality >= 0.4; quality -= 0.1) {
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    if (jpeg.length <= maxDataUrlLength) return jpeg;
  }
  return null;
}
