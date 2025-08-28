import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { analyzeBreadPhoto, convertFileToBase64, type BreadAnalysis } from "@/lib/breadAnalysis";
import { useToast } from "@/hooks/use-toast";

interface BreadAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImage?: string;
}

export default function BreadAnalysisModal({ open, onOpenChange, initialImage }: BreadAnalysisModalProps) {
  const [selectedImage, setSelectedImage] = useState<string>(initialImage || "");
  const [analysis, setAnalysis] = useState<BreadAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setAnalysis(null); // Clear previous analysis
    };
    reader.readAsDataURL(file);
  };

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
      const result = await analyzeBreadPhoto(base64Data);
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
          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="text-center">
              {selectedImage ? (
                <div className="relative">
                  <img 
                    src={selectedImage} 
                    alt="Bread to analyze" 
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('bread-image-input')?.click()}
                    className="mt-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-sourdough-300 rounded-lg p-8 cursor-pointer hover:border-sourdough-500 transition-colors"
                  onClick={() => document.getElementById('bread-image-input')?.click()}
                >
                  <Camera className="w-12 h-12 mx-auto mb-4 text-sourdough-400" />
                  <p className="text-sourdough-600">Click to upload a photo of your bread</p>
                </div>
              )}
              
              <input
                id="bread-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {selectedImage && !analysis && (
              <div className="text-center">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-accent-orange-500 hover:bg-accent-orange-600"
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
            )}
          </div>

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