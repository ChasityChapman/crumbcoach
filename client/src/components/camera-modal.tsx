import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, Images, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto, capturePhotoFromCamera, createImagePreview } from "@/lib/storage";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeId?: string;
}

export default function CameraModal({ isOpen, onClose, bakeId }: CameraModalProps) {
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, bakeId }: { file: File; bakeId: string }) => {
      // Upload to Supabase storage
      const uploadResult = await uploadPhoto(file, bakeId);
      if (!uploadResult) {
        throw new Error('Failed to upload photo');
      }

      // Save photo metadata to database
      const photoData = {
        bakeId,
        filename: uploadResult.filename,
        caption: "Bake progress photo"
      };
      
      return apiRequest("POST", "/api/photos", photoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: "Photo captured!",
        description: "Your bake photo has been saved.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to save photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedPhoto(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleCapturePhoto = async () => {
    if (!bakeId) {
      toast({
        title: "No active bake",
        description: "Start a bake to capture photos.",
        variant: "destructive",
      });
      return;
    }

    if (!videoRef.current || !cameraStream) {
      toast({
        title: "Camera not ready",
        description: "Please wait for camera to initialize.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          
          // Show preview
          const preview = await createImagePreview(file);
          setCapturedPhoto(preview);
          
          // Upload photo
          uploadPhotoMutation.mutate({ file, bakeId });
        }
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
      toast({
        title: "Capture failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectFromGallery = () => {
    // In a real app, this would open the device's photo gallery
    toast({
      title: "Photo gallery",
      description: "Gallery selection would open here.",
    });
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast({
      title: "Camera switched",
      description: "Switched to front/back camera.",
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-full h-full bg-black border-none">
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-6 h-6" />
            </Button>
            <h3 className="font-medium">Capture Bake Photo</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFlashEnabled(!flashEnabled)}
              className={`text-white hover:bg-white/20 ${flashEnabled ? 'bg-white/20' : ''}`}
            >
              <Zap className="w-6 h-6" />
            </Button>
          </div>
          
          {/* Camera Preview Area */}
          <div className="flex-1 relative">
            {capturedPhoto ? (
              // Show captured photo preview
              <div className="w-full h-full relative">
                <img 
                  src={capturedPhoto} 
                  alt="Captured photo" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="bg-white/20 rounded-full p-4 mb-4">
                      <Camera className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-medium">Photo Captured!</p>
                    <p className="text-sm opacity-75">Uploading to storage...</p>
                  </div>
                </div>
              </div>
            ) : cameraStream ? (
              // Show live camera feed
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              // Show loading state
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Starting Camera...</p>
                  <p className="text-sm opacity-75">
                    Please allow camera access when prompted
                  </p>
                </div>
              </div>
            )}
            
            {/* Capture Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center space-x-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSelectFromGallery}
                className="w-12 h-12 bg-white/20 rounded-full text-white hover:bg-white/30"
              >
                <Images className="w-6 h-6" />
              </Button>
              
              <Button
                onClick={handleCapturePhoto}
                disabled={uploadPhotoMutation.isPending || !cameraStream || !!capturedPhoto}
                className="w-16 h-16 bg-white rounded-full hover:bg-gray-100 text-sourdough-800 disabled:opacity-50"
              >
                {uploadPhotoMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-sourdough-800 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwitchCamera}
                className="w-12 h-12 bg-white/20 rounded-full text-white hover:bg-white/30"
              >
                <RotateCcw className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
