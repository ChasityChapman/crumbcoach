import { Camera, StickyNote, Clock, Plus, ChefHat } from "lucide-react";

interface QuickActionsProps {
  onOpenCamera: () => void;
  onOpenNotes: () => void;
  onStartBake: () => void;
  onNewRecipe?: () => void;
  onAdjustTimeline?: () => void;
  hasActiveBake: boolean;
  isCreatingBake?: boolean;
}

export default function QuickActions({ 
  onOpenCamera, 
  onOpenNotes, 
  onStartBake,
  onNewRecipe,
  onAdjustTimeline,
  hasActiveBake,
  isCreatingBake = false
}: QuickActionsProps) {
  return (
    <div className="px-4 mb-6">
      <h3 className="font-semibold text-sourdough-800 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-3">
        <button 
          onClick={onOpenCamera}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <Camera className="w-6 h-6 text-accent-orange-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">Photo</p>
        </button>
        
        <button 
          onClick={onOpenNotes}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <StickyNote className="w-6 h-6 text-sourdough-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">Notes</p>
        </button>
        
        <button 
          onClick={onStartBake}
          disabled={isCreatingBake}
          className={`rounded-xl p-4 shadow-sm text-center transition-colors ${
            hasActiveBake 
              ? 'bg-white border border-sourdough-100 hover:bg-sourdough-50 text-sourdough-800'
              : 'bg-sourdough-500 hover:bg-sourdough-600 text-white'
          } ${isCreatingBake ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className={`w-6 h-6 mx-auto mb-2 ${
            hasActiveBake ? 'text-accent-orange-500' : 'text-white'
          }`} />
          <p className="text-sm font-medium">
            {isCreatingBake ? 'Creating...' : (hasActiveBake ? 'New Bake' : 'Start Bake')}
          </p>
        </button>
        
        <button 
          onClick={onNewRecipe}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <ChefHat className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">New Recipe</p>
        </button>
      </div>
    </div>
  );
}
