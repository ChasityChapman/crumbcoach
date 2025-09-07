import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Clock, Thermometer, Camera, BookOpen, Lightbulb } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-primary/10 dark:from-primary/20 dark:via-black dark:to-primary/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-4">
              <ChefHat className="h-12 w-12 text-primary dark:text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Crumb Coach
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your intelligent sourdough baking assistant with real-time environmental monitoring, 
            automated timeline adjustments, and comprehensive baking guidance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <Thermometer className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <CardTitle>Smart Environmental Monitoring</CardTitle>
              <CardDescription>
                Real-time temperature and humidity tracking with automatic timeline adjustments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <Clock className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <CardTitle>Intelligent Timeline Management</CardTitle>
              <CardDescription>
                Dynamic baking schedules that adapt to your environment and conditions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <Camera className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <CardTitle>Photo Documentation</CardTitle>
              <CardDescription>
                Capture and organize photos throughout your baking process
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <BookOpen className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <CardTitle>Recipe Management</CardTitle>
              <CardDescription>
                Store and customize your favorite sourdough recipes with hydration presets
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <Lightbulb className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <CardTitle>Interactive Tutorials</CardTitle>
              <CardDescription>
                Step-by-step guidance for perfecting your sourdough techniques
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 dark:border-primary/20">
            <CardHeader>
              <div className="bg-primary/20 dark:bg-primary/20 rounded-full p-3 w-fit">
                <ChefHat className="h-6 w-6 text-primary dark:text-primary" />
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
          <Card className="max-w-md mx-auto border-primary/20 dark:border-primary/20">
            <CardHeader>
              <CardTitle>Ready to Perfect Your Sourdough?</CardTitle>
              <CardDescription>
                Sign in with your account to start your intelligent baking journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleLogin}
                className="w-full"
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