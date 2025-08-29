import { Capacitor } from '@capacitor/core';
import { trackUserAction } from './firebase-analytics';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializePerformanceTracking();
  }

  private initializePerformanceTracking() {
    if (typeof window === 'undefined') return;

    // Track page load times
    window.addEventListener('load', () => {
      this.trackPageLoad();
    });

    // Track navigation performance
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObservers();
    }

    // Track memory usage (if available)
    this.trackMemoryUsage();
  }

  private trackPageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      
      this.recordMetric('page_load_time', loadTime);
      this.recordMetric('dom_content_loaded', domContentLoaded);
      
      // Report to analytics
      trackUserAction('performance_metric', {
        metric_type: 'page_load',
        load_time: Math.round(loadTime),
        dom_ready_time: Math.round(domContentLoaded),
        platform: Capacitor.getPlatform(),
      });
    }
  }

  private setupPerformanceObservers() {
    // Observe Core Web Vitals
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
        
        trackUserAction('web_vital', {
          metric: 'lcp',
          value: Math.round(lastEntry.startTime),
          rating: this.getRating('lcp', lastEntry.startTime),
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.recordMetric('fid', fid);
          
          trackUserAction('web_vital', {
            metric: 'fid',
            value: Math.round(fid),
            rating: this.getRating('fid', fid),
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        this.recordMetric('cls', clsValue);
        
        trackUserAction('web_vital', {
          metric: 'cls',
          value: Math.round(clsValue * 1000) / 1000,
          rating: this.getRating('cls', clsValue),
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Performance observers not fully supported:', error);
    }
  }

  private trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        const memoryInfo = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        };
        
        this.recordMetric('memory_used', memoryInfo.used);
        this.recordMetric('memory_total', memoryInfo.total);
        
        // Report high memory usage
        const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
        if (usagePercent > 80) {
          trackUserAction('performance_warning', {
            type: 'high_memory_usage',
            usage_percent: Math.round(usagePercent),
            used_mb: Math.round(memoryInfo.used / 1024 / 1024),
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Track API response times
  trackApiCall(endpoint: string, startTime: number, endTime: number, status: number) {
    const responseTime = endTime - startTime;
    this.recordMetric(`api_${endpoint}`, responseTime);

    trackUserAction('api_performance', {
      endpoint,
      response_time: Math.round(responseTime),
      status_code: status,
      performance_rating: responseTime < 500 ? 'good' : responseTime < 2000 ? 'average' : 'slow',
    });

    // Alert on slow API calls
    if (responseTime > 5000) {
      trackUserAction('performance_warning', {
        type: 'slow_api_call',
        endpoint,
        response_time: Math.round(responseTime),
      });
    }
  }

  // Track component render times
  trackComponentRender(componentName: string, renderTime: number) {
    this.recordMetric(`render_${componentName}`, renderTime);

    if (renderTime > 100) {
      trackUserAction('performance_metric', {
        metric_type: 'slow_component_render',
        component: componentName,
        render_time: Math.round(renderTime),
      });
    }
  }

  // Track user interactions and their responsiveness
  trackInteraction(interactionType: string, startTime: number, endTime: number) {
    const responseTime = endTime - startTime;
    this.recordMetric(`interaction_${interactionType}`, responseTime);

    trackUserAction('interaction_performance', {
      interaction_type: interactionType,
      response_time: Math.round(responseTime),
      responsiveness: responseTime < 100 ? 'excellent' : responseTime < 300 ? 'good' : 'needs_improvement',
    });
  }

  private recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
  }

  // Get performance summary for debugging
  getPerformanceSummary(): PerformanceMetrics {
    return {
      loadTime: this.metrics.get('page_load_time') || 0,
      renderTime: this.metrics.get('dom_content_loaded') || 0,
      apiResponseTime: Array.from(this.metrics.entries())
        .filter(([key]) => key.startsWith('api_'))
        .reduce((sum, [, value]) => sum + value, 0) / 
        Array.from(this.metrics.entries()).filter(([key]) => key.startsWith('api_')).length || 0,
      memoryUsage: this.metrics.get('memory_used'),
    };
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Helper function to wrap API calls with performance tracking
export function withPerformanceTracking<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return apiCall()
    .then((result) => {
      const endTime = performance.now();
      performanceMonitor.trackApiCall(endpoint, startTime, endTime, 200);
      return result;
    })
    .catch((error) => {
      const endTime = performance.now();
      const status = error.response?.status || 500;
      performanceMonitor.trackApiCall(endpoint, startTime, endTime, status);
      throw error;
    });
}