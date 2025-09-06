import { Link, useLocation } from "wouter";
import { Home, BookOpen, Play, User, Clock, CalendarClock, FlaskConical, Cookie } from "lucide-react";

interface BottomNavigationProps {
  currentPath: string;
}

export default function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-sourdough-100 safe-area-pb z-40">
      <div className="grid grid-cols-6 py-3 px-1 max-w-lg mx-auto">
        <Link href="/">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>
        </Link>
        
        <Link href="/recipes">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/recipes') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs">Recipes</span>
          </button>
        </Link>
        
        <Link href="/starter">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/starter') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <FlaskConical className="w-5 h-5 mb-1" />
            <span className="text-xs">Starter</span>
          </button>
        </Link>
        
        <Link href="/timeline-planner">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/timeline-planner') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <CalendarClock className="w-5 h-5 mb-1" />
            <span className="text-xs">Timeline</span>
          </button>
        </Link>
        
        <Link href="/recent-bakes">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/recent-bakes') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <Cookie className="w-5 h-5 mb-1" />
            <span className="text-xs">Bakes</span>
          </button>
        </Link>
        
        <Link href="/profile">
          <button className={`flex flex-col items-center py-2 px-1 ${
            isActive('/profile') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
