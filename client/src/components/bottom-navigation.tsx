import { Link, useLocation } from "wouter";
import { Home, BookOpen, Play, User } from "lucide-react";

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
      <div className="grid grid-cols-4 py-2">
        <Link href="/">
          <button className={`flex flex-col items-center py-2 px-4 ${
            isActive('/') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>
        </Link>
        
        <Link href="/recipes">
          <button className={`flex flex-col items-center py-2 px-4 ${
            isActive('/recipes') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs">Recipes</span>
          </button>
        </Link>
        
        <Link href="/tutorials">
          <button className={`flex flex-col items-center py-2 px-4 ${
            isActive('/tutorials') ? 'text-accent-orange-500' : 'text-sourdough-500'
          }`}>
            <Play className="w-5 h-5 mb-1" />
            <span className="text-xs">Tutorials</span>
          </button>
        </Link>
        
        <Link href="/profile">
          <button className={`flex flex-col items-center py-2 px-4 ${
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
