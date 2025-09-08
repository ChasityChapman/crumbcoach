import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

// Check if we're in demo mode
const isDemoMode = () => {
  return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // In demo mode, return mock responses
  if (isDemoMode()) {
    console.warn(`Demo mode: Mocking API request ${method} ${url}`);
    
    // Create mock response based on the endpoint
    const mockData = getMockApiResponse(method, url, data);
    
    return new Response(JSON.stringify(mockData), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Mock API responses for demo mode
function getMockApiResponse(method: string, url: string, data?: unknown): any {
  // Handle timeline steps
  if (url.includes('/api/timeline-steps')) {
    if (method === 'POST') {
      return {
        id: `demo-step-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (method === 'PATCH') {
      return {
        id: url.split('/').pop(),
        ...data,
        updatedAt: new Date().toISOString(),
      };
    }
    if (method === 'GET') {
      // Return demo timeline steps with proper timestamps
      return [
        {
          id: 'demo-timeline-step-1',
          bakeId: 'demo-bake-1',
          name: 'Mix ingredients',
          description: 'Combine flour, water, starter, and salt',
          duration: 15,
          order: 1,
          startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          endTime: new Date(Date.now() - 3600000 + 900000).toISOString(), // 45 min ago
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          demo: true
        }
      ];
    }
  }

  // Handle bakes
  if (url.includes('/api/bakes')) {
    if (method === 'PATCH') {
      return {
        id: url.split('/')[3], // Extract bake ID
        ...data,
        updatedAt: new Date().toISOString(),
      };
    }
    if (method === 'DELETE') {
      return { success: true, deleted: true };
    }
    if (url.includes('/recalibrate')) {
      return { success: true, recalibrated: true };
    }
    if (method === 'GET') {
      // Return demo bake data with proper timestamps
      return [
        {
          id: 'demo-bake-1',
          userId: 'demo-user',
          recipeId: 'demo-recipe-1',
          recipeName: 'Classic Sourdough Loaf',
          status: 'active',
          startTime: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
          endTime: null,
          notes: 'Demo bake in progress',
          finalWeight: null,
          finalScore: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
          demo: true
        }
      ];
    }
  }

  // Handle AI/Gemini endpoints
  if (url.includes('/api/ai') || url.includes('/api/gemini') || url.includes('gemini')) {
    return {
      success: true,
      response: "This is a demo response from the AI assistant.",
      demo: true
    };
  }

  // Handle bread analysis endpoint
  if (url.includes('/api/analyze-bread')) {
    return {
      overallScore: 7.5,
      crumbStructure: {
        score: 8.0,
        feedback: "Demo: Your crumb shows good structure with nice irregular holes. The fermentation appears well-developed with a tender, open texture that suggests proper proofing time."
      },
      crust: {
        score: 7.0,
        feedback: "Demo: The crust has a lovely golden color with good caramelization. Consider increasing steam in the first 15 minutes for an even more dramatic ear and crust development."
      },
      shape: {
        score: 7.5,
        feedback: "Demo: Nice overall shape with good height. The scoring technique shows skill - try experimenting with deeper cuts for more dramatic opening."
      },
      suggestions: [
        "Try extending bulk fermentation by 15-20 minutes for even better structure",
        "Experiment with higher hydration (75-80%) for more open crumb",
        "Consider using a Dutch oven for the first 20 minutes to improve crust",
        "Score with a sharper blade held at 30-45 degree angle for better ear development"
      ],
      strengths: [
        "Excellent fermentation timing",
        "Good shaping technique",
        "Nice golden crust color",
        "Well-developed flavor profile visible in crumb structure"
      ],
      demo: true
    };
  }

  // Handle photos/images
  if (url.includes('/api/photos') || url.includes('/api/images')) {
    if (method === 'POST') {
      return {
        id: `demo-photo-${Date.now()}`,
        url: '/placeholder-image.jpg',
        ...data,
        createdAt: new Date().toISOString(),
      };
    }
    if (method === 'GET') {
      // Return demo photos with proper timestamps
      return [
        {
          id: 'demo-photo-1',
          bakeId: 'demo-bake-1',
          url: '/placeholder-image.jpg',
          description: 'Demo bread photo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          demo: true
        }
      ];
    }
  }

  // Handle notes
  if (url.includes('/api/notes')) {
    if (method === 'POST') {
      return {
        id: `demo-note-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (method === 'GET') {
      // Return demo notes with proper timestamps
      return [
        {
          id: 'demo-note-1',
          bakeId: 'demo-bake-1',
          content: 'This is a demo note for the bake',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          demo: true
        }
      ];
    }
  }

  // Handle sensors
  if (url.includes('/api/sensors')) {
    return {
      temperature: 22.5,
      humidity: 65.2,
      timestamp: new Date().toISOString(),
      demo: true
    };
  }

  // Handle recipes
  if (url.includes('/api/recipes') || url.includes('recipes')) {
    return [
      {
        id: 'demo-recipe-1',
        userId: 'demo-user',
        name: 'Classic Sourdough Loaf',
        description: 'A traditional sourdough bread perfect for beginners with a golden crust and tangy flavor',
        thumbnailUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop&crop=center',
        totalTimeHours: 8,
        difficulty: 'beginner',
        ingredients: [
          { id: '1', name: 'Bread flour', amount: 500, unit: 'g' },
          { id: '2', name: 'Water', amount: 350, unit: 'ml' },
          { id: '3', name: 'Sourdough starter', amount: 100, unit: 'g' },
          { id: '4', name: 'Salt', amount: 10, unit: 'g' }
        ],
        steps: [
          { id: '1', name: 'Autolyse', duration: 30, description: 'Mix flour and water, let rest 30 minutes' },
          { id: '2', name: 'Mix dough', duration: 15, description: 'Add starter and salt, mix well' },
          { id: '3', name: 'Bulk ferment', duration: 240, description: 'Bulk ferment 4 hours with folds every 30 minutes' },
          { id: '4', name: 'Pre-shape', duration: 15, description: 'Shape into loose rounds' },
          { id: '5', name: 'Final proof', duration: 120, description: 'Shape and final proof 2 hours' },
          { id: '6', name: 'Bake', duration: 45, description: 'Bake at 450°F for 45 minutes' }
        ],
        createdAt: new Date().toISOString(),
        demo: true
      },
      {
        id: 'demo-recipe-2',
        userId: 'demo-user',
        name: 'Artisan Whole Wheat',
        description: 'A hearty whole wheat sourdough with complex flavors and dense texture',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&crop=center',
        totalTimeHours: 10,
        difficulty: 'intermediate',
        ingredients: [
          { id: '1', name: 'Whole wheat flour', amount: 300, unit: 'g' },
          { id: '2', name: 'Bread flour', amount: 200, unit: 'g' },
          { id: '3', name: 'Water', amount: 375, unit: 'ml' },
          { id: '4', name: 'Sourdough starter', amount: 125, unit: 'g' },
          { id: '5', name: 'Salt', amount: 12, unit: 'g' }
        ],
        steps: [
          { id: '1', name: 'Autolyse', duration: 45, description: 'Mix flours and water, rest 45 minutes' },
          { id: '2', name: 'Mix dough', duration: 20, description: 'Add starter and salt, develop gluten' },
          { id: '3', name: 'Bulk ferment', duration: 300, description: 'Bulk ferment 5 hours with folds' },
          { id: '4', name: 'Shape', duration: 20, description: 'Shape into boules' },
          { id: '5', name: 'Final proof', duration: 180, description: 'Cold retard overnight or 3 hours room temp' },
          { id: '6', name: 'Bake', duration: 50, description: 'Bake at 425°F for 50 minutes' }
        ],
        createdAt: new Date().toISOString(),
        demo: true
      },
      {
        id: 'demo-recipe-3',
        userId: 'demo-user',
        name: 'Seeded Rye Sourdough',
        description: 'Advanced rye bread with seeds, perfect for experienced bakers seeking complex flavors',
        thumbnailUrl: 'https://images.unsplash.com/photo-1600214593079-9b0f43a31b23?w=400&h=400&fit=crop&crop=center',
        totalTimeHours: 12,
        difficulty: 'advanced',
        ingredients: [
          { id: '1', name: 'Rye flour', amount: 200, unit: 'g' },
          { id: '2', name: 'Bread flour', amount: 300, unit: 'g' },
          { id: '3', name: 'Water', amount: 400, unit: 'ml' },
          { id: '4', name: 'Rye starter', amount: 150, unit: 'g' },
          { id: '5', name: 'Salt', amount: 12, unit: 'g' },
          { id: '6', name: 'Sunflower seeds', amount: 50, unit: 'g' },
          { id: '7', name: 'Caraway seeds', amount: 15, unit: 'g' }
        ],
        steps: [
          { id: '1', name: 'Prepare seeds', duration: 30, description: 'Toast and soak seeds' },
          { id: '2', name: 'Autolyse', duration: 60, description: 'Mix flours and water, rest 1 hour' },
          { id: '3', name: 'Mix dough', duration: 25, description: 'Add starter, salt, and seeds' },
          { id: '4', name: 'Bulk ferment', duration: 360, description: 'Long ferment 6 hours with gentle folds' },
          { id: '5', name: 'Shape', duration: 30, description: 'Shape into batard' },
          { id: '6', name: 'Final proof', duration: 240, description: 'Cold retard 4+ hours' },
          { id: '7', name: 'Bake', duration: 55, description: 'Steam bake at 450°F for 55 minutes' }
        ],
        createdAt: new Date().toISOString(),
        demo: true
      }
    ];
  }

  // Handle timeline plans
  if (url.includes('/api/timeline-plans') || url.includes('timeline-plans')) {
    return [
      {
        id: 'demo-timeline-plan-1',
        userId: 'demo-user',
        name: 'Basic Sourdough Timeline',
        description: 'Standard timeline for sourdough bread',
        totalDurationMinutes: 480,
        steps: JSON.stringify([
          {
            name: 'Mix ingredients',
            duration: 15,
            order: 1,
            description: 'Combine flour, water, starter, and salt'
          },
          {
            name: 'Bulk fermentation',
            duration: 300,
            order: 2,
            description: 'Let dough rise with periodic folds'
          },
          {
            name: 'Final proof',
            duration: 120,
            order: 3,
            description: 'Shape and final rise'
          },
          {
            name: 'Bake',
            duration: 45,
            order: 4,
            description: 'Bake in preheated oven'
          }
        ]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        demo: true
      }
    ];
  }

  // Default mock response - ensure it returns an array for most queries
  if (method === 'GET') {
    return [];
  }
  return { success: true, demo: true };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // In demo mode, return mock responses for query functions
    if (isDemoMode()) {
      const url = queryKey.join("/") as string;
      console.warn(`Demo mode: Mocking query ${url}`);
      
      const mockData = getMockApiResponse('GET', url);
      return mockData;
    }

    const authHeaders = await getAuthHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
