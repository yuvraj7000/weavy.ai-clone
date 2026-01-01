import { v2 as cloudinary } from "cloudinary";

function configureCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Please add your Cloudinary credentials to .env.local");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Configure on first use
let isConfigured = false;
function ensureConfigured() {
  if (!isConfigured) {
    configureCloudinary();
    isConfigured = true;
  }
}

export default cloudinary;

// Upload image from base64
export async function uploadImageFromBase64(
  base64String: string,
  folder: string = "weavy-workflows"
): Promise<{ url: string; publicId: string }> {
  try {
    ensureConfigured();
    
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Data}`,
      {
        folder,
        resource_type: "image",
      }
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image to Cloudinary";
    throw new Error(errorMessage);
  }
}

// Upload image from buffer
export async function uploadImageFromBuffer(
  buffer: Buffer,
  folder: string = "weavy-workflows"
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    try {
      ensureConfigured();
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload stream error:", error);
            reject(new Error(error.message || "Failed to upload image to Cloudinary"));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error("Upload completed but no result returned"));
          }
        }
      );

      uploadStream.end(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image to Cloudinary";
      reject(new Error(errorMessage));
    }
  });
}

