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
  const actions = [
    {
      onClick: onStartBake,
      disabled: isCreatingBake,
      ariaLabel: isCreatingBake ? 'Creating new bake...' : (hasActiveBake ? 'Start a new bake' : 'Start your first bake'),
      className: hasActiveBake 
        ? 'bg-white border border-sourdough-100 hover:bg-sourdough-50 text-sourdough-800'
        : 'bg-sourdough-500 hover:bg-sourdough-600 text-white',
      iconBg: hasActiveBake ? 'bg-accent-orange-100' : 'bg-white/20',
      iconColor: hasActiveBake ? 'text-accent-orange-600' : 'text-white',
      icon: Plus,
      label: isCreatingBake ? 'Creating...' : (hasActiveBake ? 'New Bake' : 'Start Bake')
    },
    {
      onClick: onOpenCamera,
      ariaLabel: "Take a progress photo of your bake",
      className: "bg-white border border-sourdough-100 hover:bg-sourdough-50 text-sourdough-800",
      iconBg: "bg-accent-orange-100",
      iconColor: "text-accent-orange-600",
      icon: Camera,
      label: "Photo"
    },
    {
      onClick: onOpenNotes,
      ariaLabel: "Add or view notes for your bakes",
      className: "bg-white border border-sourdough-100 hover:bg-sourdough-50 text-sourdough-800",
      iconBg: "bg-sourdough-100",
      iconColor: "text-sourdough-600",
      icon: StickyNote,
      label: "Notes"
    },
    {
      onClick: onNewRecipe,
      ariaLabel: "Create a new sourdough recipe",
      className: "bg-white border border-sourdough-100 hover:bg-sourdough-50 text-sourdough-800",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      icon: ChefHat,
      label: "New Recipe"
    }
  ].filter(action => action.onClick); // Filter out undefined actions

  return (
    <div className="px-4 mb-6">
      <h3 className="font-semibold text-sourdough-800 mb-3">Quick Actions</h3>
      {/* For 4 or fewer actions: single row grid */}
      {actions.length <= 4 && (
        <div className={`grid gap-3 ${
          actions.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
          actions.length === 2 ? 'grid-cols-2' :
          actions.length === 3 ? 'grid-cols-3' :
          'grid-cols-4'
        }`}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.ariaLabel}
                className={`rounded-2xl p-4 min-h-[72px] shadow-sm text-center transition-colors flex flex-col items-center justify-center ${
                  action.className
                } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${action.iconBg}`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </button>
            );
          })}
        </div>
      )}
      
      {/* For more than 4 actions: horizontal scroll */}
      {actions.length > 4 && (
        <div className="overflow-x-auto">
          <div className="flex gap-3 pb-2" style={{ width: `${actions.length * 90}px` }}>
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  aria-label={action.ariaLabel}
                  className={`rounded-2xl p-4 min-h-[72px] w-20 flex-shrink-0 shadow-sm text-center transition-colors flex flex-col items-center justify-center ${
                    action.className
                  } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${action.iconBg}`}>
                    <Icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  <p className="text-xs font-medium">{action.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
