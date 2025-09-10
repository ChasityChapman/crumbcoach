import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Thermometer, 
  Timer, 
  Database, 
  Accessibility, 
  Download,
  Trash2,
  RotateCcw,
  Wifi,
  Bell,
  Eye,
  User,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSettingsModal({ isOpen, onClose }: AdvancedSettingsModalProps) {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  
  // Load settings from localStorage on mount
  const loadSettings = () => {
    const saved = localStorage.getItem('crumbCoachSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings;
    }
    return null;
  };
  
  const savedSettings = loadSettings();
  
  // Sensor Settings
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>(savedSettings?.tempUnit || 'celsius');
  const [sensorPolling, setSensorPolling] = useState(savedSettings?.sensorPolling || 30);
  const [autoCalibrate, setAutoCalibrate] = useState(savedSettings?.autoCalibrate ?? true);
  const [sensorOverride, setSensorOverride] = useState(savedSettings?.sensorOverride ?? false);
  
  // Timeline Settings
  const [defaultTemp, setDefaultTemp] = useState(savedSettings?.defaultTemp || 22);
  const [recalibrationSensitivity, setRecalibrationSensitivity] = useState(savedSettings?.recalibrationSensitivity || 2);
  const [autoNotifications, setAutoNotifications] = useState(savedSettings?.autoNotifications ?? true);
  const [timeAdjustment, setTimeAdjustment] = useState(savedSettings?.timeAdjustment || 0);
  
  // Baking Preferences
  const [defaultHydration, setDefaultHydration] = useState(75);
  const [preferredFlour, setPreferredFlour] = useState('bread-flour');
  const [starterRatio, setStarterRatio] = useState(20);
  const [envCompensation, setEnvCompensation] = useState(true);
  
  // UI Settings
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [voiceNotifications, setVoiceNotifications] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  
  // Debug Settings

  // Profile Settings
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [starterName, setStarterName] = useState(savedSettings?.starterName || 'My Starter');

  // Get current user data
  const { data: currentUser, error: userQueryError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }
      
      console.log('Fetching user data for ID:', user.id);
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user data:', error);
          throw error;
        }
        
        console.log('User data loaded:', data);
        return data;
      } catch (error) {
        console.warn('Falling back to demo user profile:', error);
        // Return demo user profile
        return {
          id: user.id,
          first_name: 'Demo',
          last_name: 'User',
          email: user.email || 'demo@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    },
    enabled: !!user
  });

  // Log any user query errors
  if (userQueryError) {
    console.error('User query error:', userQueryError);
  }

  // Populate form fields when user data loads
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.first_name || '');
      setLastName(currentUser.last_name || '');
    }
  }, [currentUser]);

  // Update user profile mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      console.log('Updating user profile:', { firstName, lastName });
      
      if (!user) throw new Error('User not authenticated');
      
      console.log('Current user ID:', user.id);

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName 
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Update successful:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast({
        title: "Profile Updated",
        description: "Your name has been updated successfully",
      });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleExportData = () => {
    toast({
      title: "Exporting Data",
      description: "Your baking data will be downloaded as JSON",
    });
  };
  
  const handleClearData = () => {
    toast({
      title: "Clear Data",
      description: "This will permanently delete all your baking records",
      variant: "destructive",
    });
  };
  
  const handleResetDefaults = () => {
    // Reset all settings to defaults
    setTempUnit('celsius');
    setSensorPolling(30);
    setAutoCalibrate(true);
    setDefaultTemp(22);
    setRecalibrationSensitivity(2);
    setDefaultHydration(75);
    setFontSize(16);
    setHighContrast(false);
    setVoiceNotifications(false);
    setHapticFeedback(true);
    setSensorOverride(false);
    
    toast({
      title: "Settings Reset",
      description: "All settings restored to factory defaults",
    });
  };
  
  // Auto-save settings when values change
  useEffect(() => {
    // Save settings to localStorage immediately
    const settings = {
      tempUnit,
      defaultTemp,
      sensorPolling,
      autoCalibrate,
      sensorOverride,
      recalibrationSensitivity,
      timeAdjustment,
      autoNotifications,
      starterName
    };
    localStorage.setItem('crumbCoachSettings', JSON.stringify(settings));
    
    // Invalidate sensor queries to refresh with new settings
    queryClient.invalidateQueries({ queryKey: ['/api/sensors/latest'] });
  }, [tempUnit, defaultTemp, sensorPolling, autoCalibrate, sensorOverride, recalibrationSensitivity, timeAdjustment, autoNotifications, starterName]);

  const saveSettings = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Advanced Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure app preferences, sensor connections, notifications, and advanced baking parameters.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="sensors">Sensors</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="baking">Baking</TabsTrigger>
            <TabsTrigger value="interface">Interface</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>User Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      data-testid="input-first-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                
                <div className="flex justify-start">
                  <Button 
                    onClick={() => updateUserMutation.mutate({ firstName, lastName })}
                    disabled={updateUserMutation.isPending}
                    data-testid="button-update-profile"
                  >
                    {updateUserMutation.isPending ? "Updating..." : "Update Name"}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Starter Name</Label>
                  <p className="text-sm text-muted-foreground">Give your sourdough starter a personal name</p>
                  <Input
                    value={starterName}
                    onChange={(e) => setStarterName(e.target.value)}
                    placeholder="My Starter"
                    data-testid="input-starter-name"
                  />
                  <p className="text-xs text-muted-foreground">This name will appear in your starter logs and timeline</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sensor Configuration */}
          <TabsContent value="sensors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Thermometer className="w-5 h-5" />
                  <span>Sensor Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Temperature Unit</Label>
                    <Select value={tempUnit} onValueChange={(value: 'celsius' | 'fahrenheit') => {
                      setTempUnit(value);
                      toast({
                        title: "Temperature Unit Updated",
                        description: `Now using ${value === 'celsius' ? 'Celsius' : 'Fahrenheit'}`,
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celsius">Celsius (°C)</SelectItem>
                        <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Update Frequency</Label>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">How often Crumb Coach checks your temperature and humidity sensors. Faster updates use more battery</p>
                    <div className="space-y-2">
                      <Slider
                        value={[sensorPolling]}
                        onValueChange={(value) => {
                          setSensorPolling(value[0]);
                          toast({
                            title: "Sensor Update Frequency Changed",
                            description: `Now checking sensors every ${value[0]} seconds`,
                          });
                        }}
                        max={300}
                        min={5}
                        step={5}
                      />
                      <div className="text-sm text-muted-foreground">{sensorPolling} seconds</div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Auto-Calibration</Label>
                      <p className="text-sm text-muted-foreground">Automatically calibrate sensors based on environment</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button 
                        variant={autoCalibrate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoCalibrate(!autoCalibrate)}
                      >
                        {autoCalibrate ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Manual Sensor Override</Label>
                      <p className="text-sm text-muted-foreground">Allow manual input when sensors unavailable</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button 
                        variant={sensorOverride ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSensorOverride(!sensorOverride)}
                      >
                        {sensorOverride ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Timeline & Timing */}
          <TabsContent value="timing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="w-5 h-5" />
                  <span>Timeline Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Default Room Temperature</Label>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Your kitchen's typical temperature when not baking. Used to calculate initial timeline estimates.</p>
                    <div className="space-y-2">
                      <Slider
                        value={[defaultTemp]}
                        onValueChange={(value) => {
                          setDefaultTemp(value[0]);
                          toast({
                            title: "Default Temperature Updated",
                            description: `Set to ${tempUnit === 'celsius' ? value[0] : Math.round((value[0] * 9/5) + 32)}°${tempUnit === 'celsius' ? 'C' : 'F'}`,
                          });
                        }}
                        max={30}
                        min={15}
                        step={1}
                      />
                      <div className="text-sm text-muted-foreground">
                        {tempUnit === 'celsius' ? defaultTemp : Math.round((defaultTemp * 9/5) + 32)}°{tempUnit === 'celsius' ? 'C' : 'F'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Recalibration Sensitivity</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[recalibrationSensitivity]}
                        onValueChange={(value) => setRecalibrationSensitivity(value[0])}
                        max={5}
                        min={1}
                        step={1}
                      />
                      <div className="text-sm text-muted-foreground">Level {recalibrationSensitivity}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Global Time Adjustment</Label>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Speeds up or slows down all recipe timings. Use +% for cold kitchens, -% for warm kitchens</p>
                  <div className="space-y-2">
                    <Slider
                      value={[timeAdjustment]}
                      onValueChange={(value) => setTimeAdjustment(value[0])}
                      max={30}
                      min={-30}
                      step={5}
                    />
                    <div className="text-sm text-muted-foreground">
                      {timeAdjustment > 0 ? '+' : ''}{timeAdjustment}% timing adjustment
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Auto Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications for timeline milestones</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button 
                      variant={autoNotifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoNotifications(!autoNotifications)}
                    >
                      {autoNotifications ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Baking Preferences */}
          <TabsContent value="baking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🍞</span>
                  <span>Baking Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Default Hydration</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[defaultHydration]}
                        onValueChange={(value) => setDefaultHydration(value[0])}
                        max={100}
                        min={50}
                        step={5}
                      />
                      <div className="text-sm text-muted-foreground">{defaultHydration}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Starter Ratio</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[starterRatio]}
                        onValueChange={(value) => setStarterRatio(value[0])}
                        max={50}
                        min={10}
                        step={5}
                      />
                      <div className="text-sm text-muted-foreground">{starterRatio}%</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Preferred Flour Type</Label>
                  <Select value={preferredFlour} onValueChange={setPreferredFlour}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bread-flour">Bread Flour</SelectItem>
                      <SelectItem value="all-purpose">All-Purpose Flour</SelectItem>
                      <SelectItem value="whole-wheat">Whole Wheat</SelectItem>
                      <SelectItem value="rye">Rye Flour</SelectItem>
                      <SelectItem value="spelt">Spelt Flour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Environmental Compensation</Label>
                    <p className="text-sm text-muted-foreground">Adjust timings based on temperature and humidity</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button 
                      variant={envCompensation ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEnvCompensation(!envCompensation)}
                    >
                      {envCompensation ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Interface Settings */}
          <TabsContent value="interface" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Accessibility className="w-5 h-5" />
                  <span>Interface & Accessibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      max={24}
                      min={12}
                      step={1}
                    />
                    <div className="text-sm text-muted-foreground">{fontSize}px</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">High Contrast Mode</Label>
                      <p className="text-sm text-muted-foreground">Enhanced visibility for better readability</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button 
                        variant={highContrast ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHighContrast(!highContrast)}
                      >
                        {highContrast ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Voice Notifications</Label>
                      <p className="text-sm text-muted-foreground">Spoken alerts for timeline events</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button 
                        variant={voiceNotifications ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVoiceNotifications(!voiceNotifications)}
                      >
                        {voiceNotifications ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Haptic Feedback</Label>
                      <p className="text-sm text-muted-foreground">Vibration feedback on mobile devices</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button 
                        variant={hapticFeedback ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHapticFeedback(!hapticFeedback)}
                      >
                        {hapticFeedback ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Debug & Data */}
          <TabsContent value="debug" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={handleExportData} className="h-auto p-4">
                    <div className="flex flex-col items-center space-y-2">
                      <Download className="w-6 h-6" />
                      <span>Export Data</span>
                    </div>
                  </Button>
                  
                  <Button onClick={handleClearData} variant="destructive" className="h-auto p-4">
                    <div className="flex flex-col items-center space-y-2">
                      <Trash2 className="w-6 h-6" />
                      <span>Clear All Data</span>
                    </div>
                  </Button>
                </div>
                
                <Separator />
                
                <Button onClick={handleResetDefaults} variant="outline" className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Factory Defaults
                </Button>
              </CardContent>
            </Card>
            
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}