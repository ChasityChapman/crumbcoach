import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Clock, Thermometer, Camera, BookOpen, Lightbulb } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950 dark:via-black dark:to-amber-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-4">
              <ChefHat className="h-12 w-12 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            SourDough Pro
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your intelligent sourdough baking assistant with real-time environmental monitoring, 
            automated timeline adjustments, and comprehensive baking guidance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <Thermometer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Smart Environmental Monitoring</CardTitle>
              <CardDescription>
                Real-time temperature and humidity tracking with automatic timeline adjustments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Intelligent Timeline Management</CardTitle>
              <CardDescription>
                Dynamic baking schedules that adapt to your environment and conditions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <Camera className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Photo Documentation</CardTitle>
              <CardDescription>
                Capture and organize photos throughout your baking process
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Recipe Management</CardTitle>
              <CardDescription>
                Store and customize your favorite sourdough recipes with hydration presets
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <Lightbulb className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Interactive Tutorials</CardTitle>
              <CardDescription>
                Step-by-step guidance for perfecting your sourdough techniques
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit">
                <ChefHat className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Personal Baking Data</CardTitle>
              <CardDescription>
                Track multiple concurrent bakes with detailed notes and progress tracking
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle>Ready to Perfect Your Sourdough?</CardTitle>
              <CardDescription>
                Sign in with your account to start your intelligent baking journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleLogin}
                className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                size="lg"
              >
                Sign In to Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}