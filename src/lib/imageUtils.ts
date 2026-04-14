import { supabase } from "@/integrations/supabase/client";

/**
 * Compress an image (from data URL or blob URL) to JPEG with reduced quality.
 * Returns a Blob ready for upload.
 */
export async function compressImage(
  src: string,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/**
 * Upload a single image to Supabase storage, returns the public URL.
 */
export async function uploadImageToStorage(
  userId: string,
  imageSource: string,
  index: number
): Promise<string> {
  // If already a storage URL, skip
  if (imageSource.startsWith("http") && !imageSource.startsWith("blob:")) {
    return imageSource;
  }

  const blob = await compressImage(imageSource);
  const fileName = `${userId}/${Date.now()}_${index}.jpg`;

  const { error } = await supabase.storage
    .from("exposee-images")
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("exposee-images")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Upload multiple images, returning persistent URLs.
 * Shows progress via optional callback.
 */
export async function uploadAllImages(
  userId: string,
  images: string[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const url = await uploadImageToStorage(userId, images[i], i);
    results.push(url);
    onProgress?.(i + 1, images.length);
  }
  return results;
}
