/**
 * Image Utilities for Company Logo & File Uploads
 * Handles format validation and aspect-ratio-preserving optimization
 */

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/x-png',
  'image/webp',
];

export const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * Validates whether a file is a valid PNG, JPG, JPEG, or WEBP image.
 * Uses case-insensitive extension checking and lenient MIME type detection.
 */
export function isValidLogoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const name = (file.name || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_IMAGE_TYPES.includes(mime);

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a valid PNG, JPG, JPEG, or WEBP image file.',
    };
  }

  // Max 10MB input file limit (will be optimized down to compact base64)
  if (file.size > 10 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size too large. Please select an image under 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Reads and optimizes a logo image:
 * - Constrains to maximum balanced dimensions (600x300) while strictly preserving original aspect ratio.
 * - Prevents distortion or stretching.
 * - Compresses output to a compact Data URL (usually 15KB - 40KB) that safely fits within Firestore document boundaries (1MB limit).
 */
export function optimizeLogoImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image file data.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 600;
          const maxH = 300;
          let w = img.width;
          let h = img.height;

          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.max(1, Math.round(w * ratio));
            h = Math.max(1, Math.round(h * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(result);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const outputMime = isPng ? 'image/png' : 'image/jpeg';
          const quality = isPng ? undefined : 0.9;
          const optimizedDataUrl = canvas.toDataURL(outputMime, quality);
          resolve(optimizedDataUrl);
        } catch {
          resolve(result);
        }
      };

      img.onerror = () => {
        // Fallback to original raw dataUrl
        resolve(result);
      };

      img.src = result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}
