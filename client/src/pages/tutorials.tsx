import { useQuery } from "@tanstack/react-query";
import type { Tutorial } from "@shared/schema";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Play } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Tutorials() {
  const { toast } = useToast();
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  
  const { data: tutorials, isLoading } = useQuery<Tutorial[]>({
    queryKey: ["/api/tutorials"],
  });
  
  const startTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setTutorialOpen(true);
    toast({
      title: "Tutorial Started!",
      description: `Starting: ${tutorial.title}`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sourdough-50">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
          <div className="px-4 py-3">
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Tutorials</h1>
          </div>
        </header>
        <div className="p-4">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 animate-pulse">
                <div className="h-32 bg-sourdough-200 rounded-lg mb-3" />
                <div className="h-4 bg-sourdough-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-sourdough-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <BottomNavigation currentPath="/tutorials" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <img src={crumbCoachLogo} alt="Crumb Coach" className="w-4 h-4 object-contain" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Tutorials</h1>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {tutorials && tutorials.length > 0 ? (
          <div className="space-y-4">
            {tutorials.map((tutorial) => (
              <Card key={tutorial.id} className="shadow-sm border-sourdough-100">
                <CardContent className="p-4">
                  {tutorial.thumbnail && (
                    <div className="relative mb-3">
                      <img 
                        src={tutorial.thumbnail} 
                        alt={tutorial.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-sourdough-800 ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-semibold text-lg text-sourdough-800">
                      {tutorial.title}
                    </h3>
                    <Badge 
                      variant={tutorial.difficulty === 'beginner' ? 'secondary' : 
                              tutorial.difficulty === 'intermediate' ? 'default' : 'destructive'}
                    >
                      {tutorial.difficulty}
                    </Badge>
                  </div>
                  
                  {tutorial.description && (
                    <p className="text-sm text-sourdough-600 mb-3">{tutorial.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-sourdough-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{tutorial.duration}m</span>
                      </div>
                      <span>{(tutorial.steps as any[])?.length || 0} steps</span>
                    </div>
                    <Button 
                      onClick={() => startTutorial(tutorial)}
                      className="bg-accent-orange-500 hover:bg-accent-orange-600 text-white"
                    >
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Play className="w-12 h-12 text-sourdough-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg text-sourdough-800 mb-2">
              No Tutorials Available
            </h3>
            <p className="text-sourdough-600">Check back later for new learning content.</p>
          </div>
        )}
      </div>

      <BottomNavigation currentPath="/tutorials" />
      
      {/* Tutorial Modal */}
      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5" />
              <span>{selectedTutorial?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTutorial && (
            <div className="space-y-4">
              {selectedTutorial.thumbnail && (
                <div className="relative">
                  <img 
                    src={selectedTutorial.thumbnail} 
                    alt={selectedTutorial.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{selectedTutorial.duration} minutes</span>
                </div>
                <Badge variant="outline">{selectedTutorial.difficulty}</Badge>
              </div>
              
              {selectedTutorial.description && (
                <p className="text-sourdough-700">{selectedTutorial.description}</p>
              )}
              
              {selectedTutorial.steps && (selectedTutorial.steps as any[]).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Tutorial Steps:</h3>
                  <div className="space-y-2">
                    {(selectedTutorial.steps as any[]).map((step: any, index: number) => (
                      <div key={index} className="flex space-x-3 p-3 bg-sourdough-50 rounded-lg">
                        <div className="w-6 h-6 bg-sourdough-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sourdough-800">{step.title || `Step ${index + 1}`}</h4>
                          {step.description && (
                            <p className="text-sm text-sourdough-600 mt-1">{String(step.description)}</p>
                          )}
                          {step.duration && (
                            <div className="flex items-center space-x-1 mt-2 text-xs text-sourdough-500">
                              <Clock className="w-3 h-3" />
                              <span>{step.duration} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setTutorialOpen(false)}>
                  Close
                </Button>
                <Button className="bg-accent-orange-500 hover:bg-accent-orange-600 text-white">
                  Begin Tutorial
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
