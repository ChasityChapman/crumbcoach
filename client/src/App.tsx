import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Recipes from "@/pages/recipes";
import RecentBakes from "@/pages/recent-bakes";
import Tutorials from "@/pages/tutorials";
import Profile from "@/pages/profile";
import Timeline from "@/pages/timeline";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recipes" component={Recipes} />
      <Route path="/recent-bakes" component={RecentBakes} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/tutorials" component={Tutorials} />
      <Route path="/profile" component={Profile} />
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
