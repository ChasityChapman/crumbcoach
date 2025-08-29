import { supabase } from './supabase';

export const STORAGE_BUCKET = 'bake-photos';

/**
 * Upload a photo file to Supabase storage
 */
export async function uploadPhoto(file: File, bakeId: string): Promise<{ url: string; filename: string } | null> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bake_${bakeId}_${timestamp}.${file.type.split('/')[1]}`;
    const filePath = `${bakeId}/${filename}`;

    console.log('Uploading photo:', filename);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('Photo uploaded successfully:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      filename: filePath
    };
  } catch (error) {
    console.error('Upload photo error:', error);
    return null;
  }
}

/**
 * Get the public URL for a stored photo
 */
export function getPhotoUrl(filename: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename);
  
  return data.publicUrl;
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(filename: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete photo error:', error);
    return false;
  }
}

/**
 * Capture photo from device camera using MediaDevices API
 */
export async function capturePhotoFromCamera(): Promise<File | null> {
  try {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment', // Use back camera by default
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    });

    // Create video element to display camera feed
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    // Create canvas to capture photo
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Stop the camera stream
    stream.getTracks().forEach(track => track.stop());

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
  } catch (error) {
    console.error('Camera capture error:', error);
    return null;
  }
}

/**
 * Create data URL from file for preview
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}