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
      return []; // Return empty timeline steps for GET requests
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
      return []; // Return empty bakes for GET requests
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
      return []; // Return empty photos for GET requests
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
      return []; // Return empty notes for GET requests
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

  // Default mock response
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
