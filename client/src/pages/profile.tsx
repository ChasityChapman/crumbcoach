import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Thermometer, Camera, Share2, Settings, Wheat } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Bake, Recipe, User as UserType } from "@shared/schema";
import AdvancedSettingsModal from "@/components/advanced-settings-modal";

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [autoSensors, setAutoSensors] = useState(true);
  const [photoBackup, setPhotoBackup] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  // Fetch real baking data
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  // Calculate statistics
  const totalBakes = bakes?.length || 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const bakesThisMonth = bakes?.filter(bake => {
    const bakeDate = new Date(bake.createdAt || new Date());
    return bakeDate.getMonth() === currentMonth && bakeDate.getFullYear() === currentYear;
  }).length || 0;
  const activeRecipes = recipes?.length || 0;

  const getUserDisplayName = () => {
    const typedUser = user as UserType;
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName} ${typedUser.lastName}`;
    }
    if (typedUser?.firstName) {
      return typedUser.firstName;
    }
    if (typedUser?.email) {
      return typedUser.email;
    }
    return "Sourdough Baker";
  };

  const getUserJoinDate = () => {
    const typedUser = user as UserType;
    if (typedUser?.createdAt) {
      return new Date(typedUser.createdAt).getFullYear();
    }
    return new Date().getFullYear();
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Crumb Coach',
        text: 'Check out this amazing sourdough baking assistant!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  const handleAdvancedSettings = () => {
    setAdvancedSettingsOpen(true);
  };

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <Wheat className="text-white w-4 h-4" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Profile</h1>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20 space-y-6">
        {/* User Profile */}
        <Card className="shadow-sm border-sourdough-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-sourdough-500 rounded-full flex items-center justify-center">
                {(user as UserType)?.profileImageUrl ? (
                  <img 
                    src={(user as UserType).profileImageUrl || ''} 
                    alt={getUserDisplayName()} 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="font-display font-semibold text-xl text-sourdough-800">
                  {getUserDisplayName()}
                </h2>
                <p className="text-sourdough-600">Home baker since {getUserJoinDate()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Baking Stats */}
        <Card className="shadow-sm border-sourdough-100">
          <CardHeader>
            <CardTitle className="font-display text-sourdough-800">Baking Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-sourdough-800">{totalBakes}</div>
                <div className="text-sm text-sourdough-600">Total Bakes</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-sourdough-800">{bakesThisMonth}</div>
                <div className="text-sm text-sourdough-600">This Month</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-sourdough-800">{activeRecipes}</div>
                <div className="text-sm text-sourdough-600">Active Recipes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="shadow-sm border-sourdough-100">
          <CardHeader>
            <CardTitle className="font-display text-sourdough-800">App Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-sourdough-600" />
                <div>
                  <div className="font-medium text-sourdough-800">Notifications</div>
                  <div className="text-sm text-sourdough-600">Timeline alerts and reminders</div>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Thermometer className="w-5 h-5 text-sourdough-600" />
                <div>
                  <div className="font-medium text-sourdough-800">Auto Sensors</div>
                  <div className="text-sm text-sourdough-600">Automatic temperature & humidity detection</div>
                </div>
              </div>
              <Switch
                checked={autoSensors}
                onCheckedChange={setAutoSensors}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera className="w-5 h-5 text-sourdough-600" />
                <div>
                  <div className="font-medium text-sourdough-800">Photo Backup</div>
                  <div className="text-sm text-sourdough-600">Save photos to device gallery</div>
                </div>
              </div>
              <Switch
                checked={photoBackup}
                onCheckedChange={setPhotoBackup}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleShareApp}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <Share2 className="w-5 h-5 mr-3" />
            Share App
          </Button>
          
          <Button 
            onClick={handleAdvancedSettings}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <Settings className="w-5 h-5 mr-3" />
            Advanced Settings
          </Button>
        </div>

        {/* App Info */}
        <Card className="shadow-sm border-sourdough-100">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-sourdough-600">
              SourDough Pro v1.0.0
            </div>
            <div className="text-xs text-sourdough-500 mt-1">
              Personal Baking Assistant
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPath="/profile" />
      
      <AdvancedSettingsModal 
        isOpen={advancedSettingsOpen}
        onClose={() => setAdvancedSettingsOpen(false)}
      />
    </div>
  );
}
