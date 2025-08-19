import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export function useCamera() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if camera is supported
    setIsSupported(
      'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    );

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (options: CameraOptions = {}) => {
    if (!isSupported) {
      setError("Camera not supported on this device");
      return false;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: options.width || 1280,
          height: options.height || 720,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setError(null);
  };

  const capturePhoto = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !isActive) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const switchCamera = async () => {
    if (!isActive) return false;

    const currentConstraints = streamRef.current?.getVideoTracks()[0]?.getSettings();
    const newFacingMode = currentConstraints?.facingMode === 'user' ? 'environment' : 'user';
    
    stopCamera();
    return await startCamera({ facingMode: newFacingMode });
  };

  return {
    videoRef,
    isSupported,
    isActive,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}
