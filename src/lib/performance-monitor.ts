/**
 * Performance Monitoring System
 * Tracks application performance metrics and provides insights
 * for optimization and user experience improvements
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'render' | 'api' | 'database' | 'interaction';
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    avgNavigationTime: number;
    avgRenderTime: number;
    avgApiTime: number;
    slowestOperations: PerformanceMetric[];
    totalMeasurements: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private marks: Map<string, number> = new Map();

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End a performance measurement
   */
  endMeasure(
    name: string,
    category: PerformanceMetric['category'] = 'interaction',
    metadata?: Record<string, unknown>
  ): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      category,
      metadata,
    });

    return duration;
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    if (import.meta.env.DEV && metric.value > 1000) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.value.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance report with summary
   */
  getReport(): PerformanceReport {
    const navigationMetrics = this.metrics.filter((m) => m.category === 'navigation');
    const renderMetrics = this.metrics.filter((m) => m.category === 'render');
    const apiMetrics = this.metrics.filter((m) => m.category === 'api');

    const avgNavigationTime =
      navigationMetrics.length > 0
        ? navigationMetrics.reduce((sum, m) => sum + m.value, 0) / navigationMetrics.length
        : 0;

    const avgRenderTime =
      renderMetrics.length > 0
        ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
        : 0;

    const avgApiTime =
      apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
        : 0;

    const slowestOperations = [...this.metrics]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      metrics: this.metrics,
      summary: {
        avgNavigationTime,
        avgRenderTime,
        avgApiTime,
        slowestOperations,
        totalMeasurements: this.metrics.length,
      },
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
