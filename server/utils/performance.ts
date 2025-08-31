// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(operation: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  static recordMetric(operation: string, value: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 1000 measurements to prevent memory leaks
    if (values.length > 1000) {
      values.shift();
    }
  }

  static getMetrics(operation?: string) {
    if (operation) {
      const values = this.metrics.get(operation) || [];
      return {
        operation,
        count: values.length,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0
      };
    }

    const allMetrics: any = {};
    this.metrics.forEach((values: number[], op: string) => {
      allMetrics[op] = {
        count: values.length,
        avg: values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0
      };
    });
    return allMetrics;
  }

  static clearMetrics() {
    this.metrics.clear();
  }
}

// Database operation performance decorator
export function measureDbOperation(operationName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const endTimer = PerformanceMonitor.startTimer(`db_${operationName}`);
      try {
        const result = await originalMethod.apply(this, args);
        endTimer();
        return result;
      } catch (error) {
        endTimer();
        throw error;
      }
    };

    return descriptor;
  };
}