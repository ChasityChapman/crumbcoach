import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Thermometer, Camera, Share2, Settings, FileText, Mail, LogOut, Trash2, AlertTriangle } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useLocation } from "wouter";
import type { Bake, Recipe, User as UserType } from "@shared/schema";
import { safeBakeQueries, safeRecipeQueries } from "@/lib/safeQueries";
import AdvancedSettingsModal from "@/components/advanced-settings-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Profile() {
  const { toast } = useToast();
  const { user, session, signOut, loading } = useSupabaseAuth();
  const isLoggingOut = loading;
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [autoSensors, setAutoSensors] = useState(true);
  const [photoBackup, setPhotoBackup] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Navigate to auth page when user logs out
  useEffect(() => {
    if (!user && !isLoggingOut) {
      navigate("/auth");
    }
  }, [user, isLoggingOut, navigate]);

  // Fetch real baking data
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
    queryFn: safeBakeQueries.getAll,
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    queryFn: safeRecipeQueries.getAll,
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
    if (user?.user_metadata?.firstName && user?.user_metadata?.lastName) {
      return `${user.user_metadata.firstName} ${user.user_metadata.lastName}`;
    }
    if (user?.user_metadata?.firstName) {
      return user.user_metadata.firstName;
    }
    if (user?.email) {
      return user.email;
    }
    return "Sourdough Baker";
  };

  const getUserJoinDate = () => {
    if (user?.created_at) {
      return new Date(user.created_at).getFullYear();
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

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to delete your account",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Call delete account API
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted",
      });

      // Sign out and redirect
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error('Delete account error:', error);
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletePassword("");
    }
  };

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <img src={crumbCoachLogo} alt="Crumb Coach" className="w-4 h-4 object-contain" />
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
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
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
            onClick={() => navigate("/terms-of-service")}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <FileText className="w-5 h-5 mr-3" />
            Terms of Service
          </Button>
          
          <Button 
            onClick={handleAdvancedSettings}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <Settings className="w-5 h-5 mr-3" />
            Advanced Settings
          </Button>
          
          <Button 
            onClick={() => navigate("/privacy-policy")}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <FileText className="w-5 h-5 mr-3" />
            Privacy Policy
          </Button>
          
          <Button 
            onClick={() => {
              window.location.href = "mailto:support@crumbcoach.com";
            }}
            variant="outline" 
            className="w-full justify-start border-sourdough-200 text-sourdough-800"
          >
            <Mail className="w-5 h-5 mr-3" />
            Contact Us
          </Button>
          
          <Button 
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            variant="outline" 
            className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
            disabled={isLoggingOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>

        {/* Danger Zone */}
        <Card className="shadow-sm border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="font-display text-red-800 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <p className="text-sm text-red-600">
              Actions here are permanent and cannot be undone.
            </p>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  Delete Account Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>Delete Account</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left space-y-3">
                    <p>
                      This action will permanently delete your account and all associated data including:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>All your recipes and baking formulas</li>
                      <li>Complete baking history and timelines</li>
                      <li>Starter logs and maintenance records</li>
                      <li>Photos and progress documentation</li>
                      <li>All personal preferences and settings</li>
                    </ul>
                    <p className="font-medium text-red-600">
                      This cannot be undone. Your data will be permanently lost.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-2">
                  <Label htmlFor="delete-password" className="text-sm font-medium">
                    Enter your password to confirm deletion:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    className="border-red-200"
                    data-testid="input-delete-password"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => {
                      setDeletePassword("");
                      setDeleteDialogOpen(false);
                    }}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !deletePassword.trim()}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-confirm-delete"
                  >
                    {isDeleting ? "Deleting..." : "Delete Account Forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="shadow-sm border-sourdough-100">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-sourdough-600">
              Crumb Coach v1.0.0
            </div>
            <div className="text-xs text-sourdough-500 mt-1">
              Personal Baking Assistant
            </div>
            <div className="text-xs text-sourdough-500 mt-2">
              <a 
                href="https://crumbcoach.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-sourdough-600 underline"
              >
                crumbcoach.com
              </a>
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
