'use client';

import { computeImageMetrics, type ImageMetrics } from '@/lib/simpleEngine/pixelAnalysis';

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = dataUrl;
  });
}

/**
 * Measures the image in the browser at feed scale (fits inside 160x160, about the 120px mobile
 * thumbnail). Nothing leaves the device. Returns null if the browser cannot decode the image.
 */
export async function measureImage(dataUrl: string): Promise<ImageMetrics | null> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(8, Math.round(img.naturalWidth * scale));
    const h = Math.max(8, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return computeImageMetrics(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return null;
  }
}

/**
 * Re-encodes an image for upload: max side `maxSide`, JPEG. Re-encoding through a canvas drops
 * EXIF/GPS metadata and keeps requests small (fewer tokens for free vision models).
 */
export async function prepareImageForUpload(dataUrl: string, maxSide = 768): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return dataUrl;
  }
}
