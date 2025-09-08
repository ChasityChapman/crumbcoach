import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-sourdough-50 safe-x">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-header">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="text-sourdough-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <img src={crumbCoachLogo} alt="Crumb Coach" className="w-4 h-4 object-contain" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Privacy Policy</h1>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <div className="p-4 pb-20">
        <Card className="shadow-sm border-sourdough-100">
          <CardHeader>
            <CardTitle className="font-display text-sourdough-800">
              Crumb Coach Privacy Policy
            </CardTitle>
            <p className="text-sm text-sourdough-600">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Information We Collect</h2>
              <p className="text-sourdough-700 mb-3">
                Crumb Coach collects and processes the following information to provide our sourdough baking assistance:
              </p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1">
                <li>Account information (username, email, name)</li>
                <li>Baking recipes and notes you create</li>
                <li>Photos you take of your baking progress</li>
                <li>Environmental sensor data (temperature, humidity) when available</li>
                <li>Baking timeline and progress data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Camera and Photo Access</h2>
              <p className="text-sourdough-700">
                Crumb Coach requests access to your device's camera and photo library solely to help you document your baking progress. 
                We use these permissions to:
              </p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1 mt-2">
                <li>Take photos of your sourdough at different stages</li>
                <li>Save baking progress photos to your device</li>
                <li>Access previously saved baking photos</li>
              </ul>
              <p className="text-sourdough-700 mt-3">
                Photos remain stored locally on your device and are not uploaded to external servers without your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">How We Use Your Information</h2>
              <p className="text-sourdough-700 mb-3">Your information is used to:</p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1">
                <li>Provide personalized baking timelines and recommendations</li>
                <li>Store and organize your recipes and baking progress</li>
                <li>Adjust timing based on environmental conditions</li>
                <li>Improve the accuracy of our baking guidance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Data Storage and Security</h2>
              <p className="text-sourdough-700">
                Your data is stored securely with industry-standard encryption. We implement appropriate technical and 
                organizational measures to protect your personal information against unauthorized access, alteration, 
                disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Data Sharing</h2>
              <p className="text-sourdough-700">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                except as necessary to provide our service or as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Your Rights</h2>
              <p className="text-sourdough-700 mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account and data</li>
                <li>Withdraw consent for data processing at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Contact Us</h2>
              <p className="text-sourdough-700">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
              </p>
              <p className="text-sourdough-700 mt-2">
                Email: support@crumbcoach.com
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Changes to This Policy</h2>
              <p className="text-sourdough-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPath="/privacy-policy" />
    </div>
  );
}