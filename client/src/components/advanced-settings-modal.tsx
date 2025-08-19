import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Code, 
  Download,
  Trash2,
  RotateCcw,
  Wifi,
  Bell,
  Eye,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSettingsModal({ isOpen, onClose }: AdvancedSettingsModalProps) {
  const { toast } = useToast();
  
  // Sensor Settings
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [sensorPolling, setSensorPolling] = useState(30);
  const [autoCalibrate, setAutoCalibrate] = useState(true);
  const [sensorOverride, setSensorOverride] = useState(false);
  
  // Timeline Settings
  const [defaultTemp, setDefaultTemp] = useState(22);
  const [recalibrationSensitivity, setRecalibrationSensitivity] = useState(2);
  const [autoNotifications, setAutoNotifications] = useState(true);
  const [timeAdjustment, setTimeAdjustment] = useState(0);
  
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
  const [debugMode, setDebugMode] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  
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
    setDebugMode(false);
    setShowRawData(false);
    
    toast({
      title: "Settings Reset",
      description: "All settings restored to factory defaults",
    });
  };
  
  const saveSettings = () => {
    // In a real app, this would save to localStorage or API
    toast({
      title: "Settings Saved",
      description: "Your advanced configuration has been updated",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>Advanced Settings</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="sensors" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sensors">Sensors</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="baking">Baking</TabsTrigger>
            <TabsTrigger value="interface">Interface</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Temperature Unit</Label>
                    <Select value={tempUnit} onValueChange={(value: 'celsius' | 'fahrenheit') => setTempUnit(value)}>
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
                    <p className="text-xs text-muted-foreground mb-2">How often Crumb Coach checks your temperature and humidity sensors. Faster updates use more battery</p>
                    <div className="space-y-2">
                      <Slider
                        value={[sensorPolling]}
                        onValueChange={(value) => setSensorPolling(value[0])}
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
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Auto-Calibration</Label>
                      <p className="text-sm text-muted-foreground">Automatically calibrate sensors based on environment</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button 
                        variant={autoCalibrate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoCalibrate(!autoCalibrate)}
                      >
                        {autoCalibrate ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Manual Sensor Override</Label>
                      <p className="text-sm text-muted-foreground">Allow manual input when sensors unavailable</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Default Room Temperature</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[defaultTemp]}
                        onValueChange={(value) => setDefaultTemp(value[0])}
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
                  <p className="text-xs text-muted-foreground mb-2">Speeds up or slows down all recipe timings. Use +% for cold kitchens, -% for warm kitchens</p>
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
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Auto Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications for timeline milestones</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
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
                <div className="grid grid-cols-2 gap-6">
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
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Environmental Compensation</Label>
                    <p className="text-sm text-muted-foreground">Adjust timings based on temperature and humidity</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
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
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">High Contrast Mode</Label>
                      <p className="text-sm text-muted-foreground">Enhanced visibility for better readability</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button 
                        variant={highContrast ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHighContrast(!highContrast)}
                      >
                        {highContrast ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Voice Notifications</Label>
                      <p className="text-sm text-muted-foreground">Spoken alerts for timeline events</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button 
                        variant={voiceNotifications ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVoiceNotifications(!voiceNotifications)}
                      >
                        {voiceNotifications ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Haptic Feedback</Label>
                      <p className="text-sm text-muted-foreground">Vibration feedback on mobile devices</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
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
                <div className="grid grid-cols-2 gap-4">
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>Developer Options</span>
                  <Badge variant="secondary">Advanced</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">Show detailed logging and error information</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button 
                        variant={debugMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDebugMode(!debugMode)}
                      >
                        {debugMode ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Show Raw Sensor Data</Label>
                      <p className="text-sm text-muted-foreground">Display unprocessed sensor readings</p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button 
                        variant={showRawData ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowRawData(!showRawData)}
                      >
                        {showRawData ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
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
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}