/**
 * Image rotation utilities for the registration form + HR review
 * dialog.
 *
 * Two flows:
 *   1. autoOrientImage  — on first upload. Reads EXIF orientation
 *      (camera phones embed this when shot in portrait/landscape),
 *      rotates the pixels to match, returns a new blob. Stored file
 *      then renders correctly regardless of browser auto-orient
 *      support.
 *   2. rotateImageBlob — manual 90° rotation. Used by the Rotate &
 *      Save button. No EXIF dependency.
 *
 * Web-only. PDFs are not handled — caller should check the MIME type
 * and skip rotation for application/pdf.
 */

/**
 * EXIF orientation values:
 *   1 = top-left (no rotation)
 *   3 = bottom-right (180°)
 *   6 = right-top (90° CW)
 *   8 = left-bottom (270° CW / 90° CCW)
 *   2,4,5,7 = flipped variants (rare on phone cameras; we ignore)
 */
async function readJpegOrientation(file: File | Blob): Promise<number> {
  if (!file.type.startsWith('image/jpeg')) return 1;

  // First ~64KB is enough — EXIF lives in the first APP1 marker.
  const buf = await file.slice(0, 64 * 1024).arrayBuffer();
  const v = new DataView(buf);

  // SOI marker 0xFFD8
  if (v.getUint16(0) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset < v.byteLength - 4) {
    const marker = v.getUint16(offset);
    offset += 2;

    if (marker === 0xFFE1) {
      // APP1 (EXIF). Skip 2-byte segment length, then "Exif\0\0"
      offset += 2;
      // "Exif"
      if (v.getUint32(offset) !== 0x45786966) return 1;
      offset += 6;

      // TIFF header: 0x4949 (little-endian "II") or 0x4D4D ("MM")
      const tiffStart = offset;
      const little = v.getUint16(offset) === 0x4949;
      offset += 2;
      // Magic 0x002A
      if (v.getUint16(offset, little) !== 0x002A) return 1;
      offset += 2;

      // IFD0 offset (relative to TIFF start)
      const ifd0Off = v.getUint32(offset, little);
      offset = tiffStart + ifd0Off;

      // Entry count
      const numEntries = v.getUint16(offset, little);
      offset += 2;

      // Each IFD entry is 12 bytes
      for (let i = 0; i < numEntries; i++) {
        const entry = offset + i * 12;
        const tag = v.getUint16(entry, little);
        if (tag === 0x0112) {
          // Orientation. Value is a SHORT (type 3) in the 9th byte.
          return v.getUint16(entry + 8, little);
        }
      }
      return 1;
    } else if ((marker & 0xFF00) !== 0xFF00) {
      // Not a valid marker — stop.
      return 1;
    } else {
      // Skip this segment using its length field.
      const segLen = v.getUint16(offset);
      offset += segLen;
    }
  }
  return 1;
}

/**
 * Translate an EXIF orientation value into the canvas rotation that
 * would un-rotate the pixels. Returns degrees clockwise.
 */
function exifOrientationToDegrees(o: number): number {
  switch (o) {
    case 3: return 180;
    case 6: return 90;
    case 8: return 270;
    default: return 0;
  }
}

/**
 * Generic rotation. Loads the blob into an Image element, draws it
 * onto a canvas with the rotation applied, returns a fresh blob of
 * the same MIME type at quality 0.92. Same image dimensions just
 * swapped on 90/270° rotations.
 */
export function rotateImageBlob(blob: Blob, degrees: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const normalised = ((degrees % 360) + 360) % 360;
    if (normalised === 0) { resolve(blob); return; }

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const swap = normalised === 90 || normalised === 270;
        canvas.width = swap ? h : w;
        canvas.height = swap ? w : h;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normalised * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2);

        const mime = blob.type || 'image/jpeg';
        canvas.toBlob(
          (out) => {
            URL.revokeObjectURL(url);
            if (!out) reject(new Error('Canvas toBlob returned null'));
            else resolve(out);
          },
          mime,
          0.92,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to load for rotation'));
    };
    img.src = url;
  });
}

/**
 * Read EXIF orientation, rotate pixels accordingly, return the
 * corrected blob. No-op (returns the original) if:
 *   - Not a JPEG
 *   - Orientation is 1 (already upright) or unknown
 *   - Browser environment without canvas/Image
 */
export async function autoOrientImage(file: File): Promise<Blob> {
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;

  // PNG/WebP don't have meaningful EXIF orientation in practice.
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return file;

  const orientation = await readJpegOrientation(file).catch(() => 1);
  const deg = exifOrientationToDegrees(orientation);
  if (deg === 0) return file;

  return rotateImageBlob(file, deg);
}
