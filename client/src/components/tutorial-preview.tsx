import { useQuery } from "@tanstack/react-query";
import type { Tutorial } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TutorialPreview() {
  const { toast } = useToast();
  const { data: tutorials } = useQuery<Tutorial[]>({
    queryKey: ["/api/tutorials"],
  });

  const handleStartTutorial = () => {
    console.log("Tutorial Starting - Interactive tutorial mode coming soon!");
  };

  if (!tutorials || tutorials.length === 0) {
    return (
      <div className="px-4 mb-6">
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No Tutorials Available"
          description="Interactive step-by-step tutorials are coming soon to help you master sourdough techniques."
          action={
            <Button variant="outline" size="sm">
              Browse Resources
            </Button>
          }
        />
      </div>
    );
  }

  const featuredTutorial = tutorials[0]; // Show first tutorial as featured
  
  // Add safety check for featuredTutorial
  if (!featuredTutorial) {
    return null;
  }

  return (
    <div className="px-4 mb-6">
      <Card className="p-4">
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
      </Card>
    </div>
  );
}
