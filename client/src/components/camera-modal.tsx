import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, Images, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeId?: string;
}

export default function CameraModal({ isOpen, onClose, bakeId }: CameraModalProps) {
  const [flashEnabled, setFlashEnabled] = useState(false);
  const { toast } = useToast();

  const capturePhotoMutation = useMutation({
    mutationFn: (photoData: { bakeId: string; filename: string; caption?: string }) => 
      apiRequest("POST", "/api/photos", photoData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
      toast({
        title: "Photo captured!",
        description: "Your bake photo has been saved.",
      });
      onClose();
    },
  });

  const handleCapturePhoto = async () => {
    if (!bakeId) {
      toast({
        title: "No active bake",
        description: "Start a bake to capture photos.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would capture from the camera
    const timestamp = new Date().toISOString();
    const filename = `bake_${bakeId}_${timestamp}.jpg`;
    
    capturePhotoMutation.mutate({
      bakeId,
      filename,
      caption: "Bake progress photo"
    });
  };

  const handleSelectFromGallery = () => {
    // In a real app, this would open the device's photo gallery
    toast({
      title: "Photo gallery",
      description: "Gallery selection would open here.",
    });
  };

  const handleSwitchCamera = () => {
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
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Camera Preview</p>
                <p className="text-sm opacity-75">
                  In a real app, live camera feed would appear here
                </p>
              </div>
            </div>
            
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
                disabled={capturePhotoMutation.isPending}
                className="w-16 h-16 bg-white rounded-full hover:bg-gray-100 text-sourdough-800"
              >
                <Camera className="w-8 h-8" />
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
