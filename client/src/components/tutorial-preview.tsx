import { useQuery } from "@tanstack/react-query";
import type { Tutorial } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
// import { useToast } from "@/hooks/use-toast"; // Disabled to prevent JavaScript errors

export default function TutorialPreview() {
  // const { toast } = useToast(); // Disabled to prevent JavaScript errors
  const { data: tutorials } = useQuery<Tutorial[]>({
    queryKey: ["/api/tutorials"],
  });

  const handleStartTutorial = () => {
    console.log("Tutorial Starting - Interactive tutorial mode coming soon!");
  };

  if (!tutorials || tutorials.length === 0) {
    return null;
  }

  const featuredTutorial = tutorials[0]; // Show first tutorial as featured
  
  // Add safety check for featuredTutorial
  if (!featuredTutorial) {
    return null;
  }

  return (
    <div className="px-4 mb-6">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sourdough-800">{featuredTutorial.title || "Tutorial"}</h4>
          <Badge variant="secondary" className="text-xs">
            {(featuredTutorial.steps as any[])?.length || 0} steps
          </Badge>
        </div>
        
        {featuredTutorial.thumbnail && (
          <div className="relative mb-3">
            <img 
              src={featuredTutorial.thumbnail} 
              alt={featuredTutorial.title || "Tutorial"}
              className="w-full h-32 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-sourdough-800 ml-1" />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-sourdough-600">
            {featuredTutorial.description || "Learn proper shaping for better rise"}
          </span>
          <Button 
            onClick={handleStartTutorial}
            className="bg-accent-orange-500 hover:bg-accent-orange-600 text-white"
          >
            Start
          </Button>
        </div>
      </div>
    </div>
  );
}
