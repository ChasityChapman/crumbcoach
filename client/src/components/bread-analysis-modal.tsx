import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Camera, Sparkles, TrendingUp, AlertCircle, Thermometer, Upload, History, X } from "lucide-react";
import { analyzeBreadPhoto, convertFileToBase64, type BreadAnalysis, type BreadContext } from "@/lib/breadAnalysis";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { bakeQueries } from "@/lib/supabaseQueries";

interface BreadAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImage?: string;
}

export default function BreadAnalysisModal({ open, onOpenChange, initialImage }: BreadAnalysisModalProps) {
  const [selectedImage, setSelectedImage] = useState<string>(initialImage || "");
  const [analysis, setAnalysis] = useState<BreadAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [context, setContext] = useState<BreadContext>({});
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [imageSource, setImageSource] = useState<'upload' | 'camera' | 'gallery'>('upload');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Get user's bakes to show photos from
  const { data: recentBakes = [] } = useQuery<any[]>({
    queryKey: ['/api/bakes'],
    enabled: open,
  });

  // Get photos from all recent bakes
  const allPhotos = recentBakes.flatMap((bake: any) => 
    (bake.photos || []).map((photo: any) => ({ ...photo, bakeName: bake.recipeName || 'Untitled Bake' }))
  );

  // Camera functionality
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera by default
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCameraPreview(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access denied",
        description: "Unable to access camera. Please use file upload instead.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelectedImage(dataUrl);
    setAnalysis(null);
    stopCamera();
    setImageSource('camera');
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraPreview(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setAnalysis(null); // Clear previous analysis
      setImageSource('upload');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoSelect = (photoData: string) => {
    setSelectedImage(photoData);
    setAnalysis(null);
    setImageSource('gallery');
  };

  // Clean up camera on close
  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload a photo of your bread first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      const base64Data = selectedImage.split(',')[1];
      const result = await analyzeBreadPhoto(base64Data, context);
      setAnalysis(result);
      toast({
        title: "Analysis complete!",
        description: "Your bread has been analyzed by our AI expert.",
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis failed",
        description: "Unable to analyze your bread. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    return "destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-orange-500" />
            AI Bread Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Selection Section */}
          {!selectedImage ? (
            <Tabs defaultValue="upload" onValueChange={(value) => setImageSource(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera
                </TabsTrigger>
                <TabsTrigger value="gallery" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  My Photos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-6">
                <div 
                  className="border-2 border-dashed border-sourdough-300 rounded-lg p-8 cursor-pointer hover:border-sourdough-500 transition-colors text-center"
                  onClick={() => document.getElementById('bread-image-input')?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-sourdough-400" />
                  <p className="text-sourdough-600 mb-2">Click to upload a photo of your bread</p>
                  <p className="text-sm text-sourdough-500">JPG, PNG or WEBP (Max 10MB)</p>
                </div>
                <input
                  id="bread-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </TabsContent>

              <TabsContent value="camera" className="mt-6">
                {showCameraPreview ? (
                  <div className="relative">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full rounded-lg shadow-md"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                      <Button onClick={capturePhoto} className="bg-accent-orange-500 hover:bg-accent-orange-600">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                      </Button>
                      <Button variant="outline" onClick={stopCamera}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div 
                      className="border-2 border-dashed border-sourdough-300 rounded-lg p-8 cursor-pointer hover:border-sourdough-500 transition-colors"
                      onClick={initializeCamera}
                    >
                      <Camera className="w-12 h-12 mx-auto mb-4 text-sourdough-400" />
                      <p className="text-sourdough-600 mb-2">Take a photo of your bread</p>
                      <p className="text-sm text-sourdough-500">Click to start camera</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gallery" className="mt-6">
                {allPhotos.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-2 gap-3">
                      {allPhotos.map((photo: any, index: number) => (
                        <div 
                          key={photo.id || index}
                          className="relative group cursor-pointer"
                          onClick={() => handlePhotoSelect(photo.filename)} // Assuming filename contains base64 data
                        >
                          <img 
                            src={photo.filename} 
                            alt={`${photo.bakeName} - ${photo.caption || 'Bread photo'}`}
                            className="w-full h-24 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity" />
                          <div className="absolute bottom-1 left-1 right-1">
                            <p className="text-xs text-white bg-black bg-opacity-50 px-1 py-0.5 rounded truncate">
                              {photo.bakeName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto mb-4 text-sourdough-400" />
                    <p className="text-sourdough-600 mb-2">No photos yet</p>
                    <p className="text-sm text-sourdough-500">Photos from your previous bakes will appear here</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center">
              <div className="relative">
                <img 
                  src={selectedImage} 
                  alt="Bread to analyze" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-md"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedImage('');
                    setAnalysis(null);
                  }}
                  className="mt-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            </div>
          )}

          {/* Context Information Section */}
          {selectedImage && !analysis && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h3 className="font-semibold text-sourdough-800 mb-4 flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Baking Context (Optional but Recommended)
                </h3>
                <p className="text-sm text-sourdough-600 mb-4">
                  Providing context helps our AI give more accurate and personalized feedback.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Environmental Conditions */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="temperature" className="text-sm font-medium">
                        Room Temperature (°C)
                      </Label>
                      <Input
                        id="temperature"
                        type="number"
                        placeholder="e.g., 22"
                        value={context.temperature || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          temperature: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="humidity" className="text-sm font-medium">
                        Humidity (%)
                      </Label>
                      <Input
                        id="humidity"
                        type="number"
                        placeholder="e.g., 65"
                        value={context.humidity || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          humidity: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Recipe Information */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="recipeName" className="text-sm font-medium">
                        Recipe Used
                      </Label>
                      <Input
                        id="recipeName"
                        placeholder="e.g., Classic Sourdough"
                        value={context.recipeName || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          recipeName: e.target.value 
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="recipeHydration" className="text-sm font-medium">
                        Dough Hydration (%)
                      </Label>
                      <Input
                        id="recipeHydration"
                        type="number"
                        placeholder="e.g., 75"
                        value={context.recipeHydration || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          recipeHydration: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Starter Information */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="starterAge" className="text-sm font-medium">
                        Starter Age & Status
                      </Label>
                      <Select 
                        value={context.starterAge || ''} 
                        onValueChange={(value) => setContext(prev => ({ ...prev, starterAge: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select starter age" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="young">Young (less than 2 weeks)</SelectItem>
                          <SelectItem value="established">Established (2 weeks - 3 months)</SelectItem>
                          <SelectItem value="mature">Mature (3+ months)</SelectItem>
                          <SelectItem value="recently-fed">Recently fed (within 24hrs)</SelectItem>
                          <SelectItem value="peak">At peak activity</SelectItem>
                          <SelectItem value="sluggish">Sluggish/needs attention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="starterHydration" className="text-sm font-medium">
                        Starter Hydration (%)
                      </Label>
                      <Input
                        id="starterHydration"
                        type="number"
                        placeholder="e.g., 100"
                        value={context.starterHydration || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          starterHydration: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Timing & Notes */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="proofingTime" className="text-sm font-medium">
                        Total Proofing Time
                      </Label>
                      <Input
                        id="proofingTime"
                        placeholder="e.g., 4 hours bulk + 12 hours cold"
                        value={context.proofingTime || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          proofingTime: e.target.value 
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="additionalNotes" className="text-sm font-medium">
                        Additional Notes
                      </Label>
                      <Textarea
                        id="additionalNotes"
                        placeholder="Any challenges, observations, or special techniques used..."
                        value={context.additionalNotes || ''}
                        onChange={(e) => setContext(prev => ({ 
                          ...prev, 
                          additionalNotes: e.target.value 
                        }))}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-accent-orange-500 hover:bg-accent-orange-600 px-8"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze My Bread
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Overall Score */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    Overall Score
                    <Badge 
                      variant={getScoreBadgeVariant(analysis.overallScore)}
                      className="text-lg px-3 py-1"
                    >
                      {analysis.overallScore}/10
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Detailed Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Crumb Structure
                      <span className={`font-bold ${getScoreColor(analysis.crumbStructure.score)}`}>
                        {analysis.crumbStructure.score}/10
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-sourdough-600">{analysis.crumbStructure.feedback}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Crust
                      <span className={`font-bold ${getScoreColor(analysis.crust.score)}`}>
                        {analysis.crust.score}/10
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-sourdough-600">{analysis.crust.feedback}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Shape
                      <span className={`font-bold ${getScoreColor(analysis.shape.score)}`}>
                        {analysis.shape.score}/10
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-sourdough-600">{analysis.shape.feedback}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strengths */}
              {analysis.strengths.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <TrendingUp className="w-5 h-5" />
                      What You Did Well
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {analysis.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-sourdough-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <AlertCircle className="w-5 h-5" />
                      Suggestions for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-sourdough-700">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="text-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedImage("");
                    setAnalysis(null);
                  }}
                >
                  Analyze Another Bread
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}