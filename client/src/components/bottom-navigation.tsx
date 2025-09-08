import { Link, useLocation } from "wouter";
import { Home, BookOpen, Play, User, Clock, CalendarClock, FlaskConical, Cookie, Brain } from "lucide-react";

interface BottomNavigationProps {
  currentPath: string;
}

export default function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-bottom z-40">
      <div className="grid grid-cols-6 py-3 px-1 max-w-lg mx-auto">
        <Link href="/">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>
        </Link>
        
        <Link href="/recipes">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/recipes') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs">Recipes</span>
          </button>
        </Link>
        
        <Link href="/starter">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/starter') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <FlaskConical className="w-5 h-5 mb-1" />
            <span className="text-xs">Starter</span>
          </button>
        </Link>
        
        <Link href="/smart-timeline">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/smart-timeline') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <Brain className="w-5 h-5 mb-1" />
            <span className="text-xs">Smart</span>
          </button>
        </Link>
        
        <Link href="/recent-bakes">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/recent-bakes') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <Cookie className="w-5 h-5 mb-1" />
            <span className="text-xs">Bakes</span>
          </button>
        </Link>
        
        <Link href="/profile">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
