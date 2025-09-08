import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useLocation } from "wouter";

export default function TermsOfService() {
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
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Terms of Service</h1>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <div className="p-4 pb-20">
        <Card className="shadow-sm border-sourdough-100">
          <CardHeader>
            <CardTitle className="font-display text-sourdough-800">
              Crumb Coach Terms of Service
            </CardTitle>
            <p className="text-sm text-sourdough-600">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Acceptance of Terms</h2>
              <p className="text-sourdough-700">
                By accessing and using Crumb Coach, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Description of Service</h2>
              <p className="text-sourdough-700">
                Crumb Coach is a sourdough baking assistance application that provides:
              </p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1 mt-2">
                <li>Baking timeline tracking and recommendations</li>
                <li>Recipe management and storage</li>
                <li>Environmental monitoring assistance</li>
                <li>Photo documentation tools</li>
                <li>Baking progress notes and guidance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">User Responsibilities</h2>
              <p className="text-sourdough-700 mb-3">You agree to:</p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1">
                <li>Provide accurate account information</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not attempt to interfere with the service's security</li>
                <li>Respect other users and their content</li>
                <li>Follow food safety practices when baking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Disclaimer of Warranties</h2>
              <p className="text-sourdough-700">
                Crumb Coach is provided "as is" without any warranties, expressed or implied. We do not guarantee that:
              </p>
              <ul className="list-disc pl-6 text-sourdough-700 space-y-1 mt-2">
                <li>The service will be uninterrupted or error-free</li>
                <li>Baking recommendations will always produce perfect results</li>
                <li>Environmental sensor readings are completely accurate</li>
                <li>The service will meet your specific requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Food Safety Notice</h2>
              <p className="text-sourdough-700">
                While Crumb Coach provides baking guidance, you are responsible for following proper food safety practices. 
                Always ensure ingredients are fresh, maintain proper hygiene, and follow safe food handling procedures. 
                We are not responsible for any foodborne illness or adverse reactions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Limitation of Liability</h2>
              <p className="text-sourdough-700">
                In no event shall Crumb Coach be liable for any indirect, incidental, special, consequential, or punitive 
                damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Account Termination</h2>
              <p className="text-sourdough-700">
                We reserve the right to terminate accounts that violate these terms. You may also terminate your account 
                at any time by contacting us or using the account deletion feature in the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Changes to Terms</h2>
              <p className="text-sourdough-700">
                We may modify these terms at any time. Continued use of the service after changes constitutes acceptance 
                of the new terms. We will notify users of significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Contact Information</h2>
              <p className="text-sourdough-700">
                For questions about these Terms of Service, contact us at:
              </p>
              <p className="text-sourdough-700 mt-2">
                Email: support@crumbcoach.com
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-sourdough-800 mb-2">Governing Law</h2>
              <p className="text-sourdough-700">
                These terms shall be governed by and construed in accordance with applicable laws, without regard to 
                conflict of law provisions.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPath="/terms-of-service" />
    </div>
  );
}