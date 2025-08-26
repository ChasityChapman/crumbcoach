import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import Recipes from "@/pages/recipes";
import RecentBakes from "@/pages/recent-bakes";
import Tutorials from "@/pages/tutorials";
import Profile from "@/pages/profile";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import TimelinePlanner from "@/pages/timeline-planner";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sourdough-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sourdough-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/landing" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/recent-bakes" component={RecentBakes} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/profile" component={Profile} />
          <Route path="/timeline-planner" component={TimelinePlanner} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
        </>
      )}
      
      {/* Public routes - available regardless of auth status */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
