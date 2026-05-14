import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables.
// Required env vars:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  /** Full CDN URL of the uploaded image */
  url: string;
  /** Secure HTTPS CDN URL */
  secureUrl: string;
  /** Cloudinary public_id for future transforms / deletions */
  publicId: string;
  /** Eager-generated thumbnail URL (200x200 crop), if requested */
  thumbnailUrl: string | null;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param buffer  Raw file bytes
 * @param folder  Cloudinary folder (e.g. "gallery/salon_xyz")
 * @param options Optional overrides passed to the upload API
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  options: Record<string, unknown> = {}
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Generate a 200x200 thumbnail as an eager transformation
        eager: [{ width: 200, height: 200, crop: 'fill', quality: 'auto' }],
        eager_async: false,
        ...options,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload failed'));
        }

        const thumbnailUrl =
          result.eager && result.eager.length > 0
            ? (result.eager[0].secure_url ?? null)
            : null;

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
