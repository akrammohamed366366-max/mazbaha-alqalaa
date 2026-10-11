/**
 * Image processing and upload utility (Client-side resize & Cloudinary unsigned upload)
 * Spark plan friendly: Zero Firebase Storage dependencies.
 */

export interface ResizeImageOptions {
  maxWidth?: number;
  initialQuality?: number;
  maxSizeBytes?: number;
}

/**
 * Resizes an image file client-side using HTML5 Canvas.
 * - Maximum width: 1200px (preserves aspect ratio)
 * - JPEG format at quality 0.8 initially
 * - Iteratively reduces quality if file size exceeds 200 KB (maxSizeBytes)
 */
export async function resizeImageToBlob(
  file: File,
  options: ResizeImageOptions = {}
): Promise<Blob> {
  const maxWidth = options.maxWidth ?? 1200;
  const initialQuality = options.initialQuality ?? 0.8;
  const maxSizeBytes = options.maxSizeBytes ?? 200 * 1024; // 200 KB

  return new Promise<Blob>((resolve, reject) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('الملف المختار ليس صورة صالحة'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate new dimensions if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('فشل معالجة أبعاد الصورة على المتصفح'));
        return;
      }

      // Fill white background for transparent PNGs converted to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Helper to convert canvas to blob at specified quality
      const getBlob = (quality: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob(
            (b) => res(b),
            'image/jpeg',
            quality
          );
        });
      };

      try {
        let quality = initialQuality;
        let blob = await getBlob(quality);

        if (!blob) {
          reject(new Error('فشل ضغط الصورة'));
          return;
        }

        // Iteratively lower quality in steps of 0.1 down to 0.4 if still over 200 KB
        while (blob.size > maxSizeBytes && quality > 0.4) {
          quality = Math.max(0.4, Number((quality - 0.1).toFixed(2)));
          const smallerBlob = await getBlob(quality);
          if (smallerBlob) {
            blob = smallerBlob;
          } else {
            break;
          }
        }

        // If still over 200 KB, perform an additional dimension scale down (e.g. 80%)
        if (blob.size > maxSizeBytes && width > 400) {
          const scaledWidth = Math.round(width * 0.8);
          const scaledHeight = Math.round(height * 0.8);
          const smallerCanvas = document.createElement('canvas');
          smallerCanvas.width = scaledWidth;
          smallerCanvas.height = scaledHeight;
          const sCtx = smallerCanvas.getContext('2d');
          if (sCtx) {
            sCtx.fillStyle = '#FFFFFF';
            sCtx.fillRect(0, 0, scaledWidth, scaledHeight);
            sCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
            const scaledBlob = await new Promise<Blob | null>((res) => {
              smallerCanvas.toBlob((b) => res(b), 'image/jpeg', 0.7);
            });
            if (scaledBlob) {
              blob = scaledBlob;
            }
          }
        }

        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة ملف الصورة'));
    };

    img.src = objectUrl;
  });
}

/**
 * Checks if Cloudinary unsigned upload configuration is present.
 */
export function isCloudinaryConfigured(): boolean {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  return Boolean(cloudName && uploadPreset && cloudName.trim() !== '' && uploadPreset.trim() !== '');
}

/**
 * Uploads a processed image blob/file to Cloudinary unsigned upload endpoint.
 * Returns the secure HTTPS URL.
 */
export async function uploadToCloudinary(blobOrFile: Blob | File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('إعدادات Cloudinary غير متوفرة (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`;
  const formData = new FormData();
  formData.append('file', blobOrFile, 'upload.jpg');
  formData.append('upload_preset', uploadPreset.trim());
  formData.append('folder', 'mazbaha');

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = 'فشل رفع الصورة إلى الخادم';
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errorMsg = `خطأ أثناء الرفع: ${errData.error.message}`;
      }
    } catch {
      // Use fallback errorMsg
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error('لم يتم استلام رابط الصورة من السيرفر');
  }

  return data.secure_url as string;
}

/**
 * Full workflow: resizes the File client-side to max 1200px and under 200 KB,
 * then uploads to Cloudinary if configured.
 * Throws an Arabic error if Cloudinary is not configured or upload fails.
 */
export async function processAndUploadImage(file: File): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('خدمة رفع الصور المباشر غير مهيأة. يرجى إدخال رابط الصورة يدوياً.');
  }

  // Step 1: Resize and compress
  const compressedBlob = await resizeImageToBlob(file, {
    maxWidth: 1200,
    initialQuality: 0.8,
    maxSizeBytes: 200 * 1024,
  });

  // Step 2: Upload to Cloudinary
  return await uploadToCloudinary(compressedBlob);
}
