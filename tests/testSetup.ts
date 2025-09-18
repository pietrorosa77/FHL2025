// Global test setup for Vitest
// Provides minimal polyfills shared across all tests.

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Potential future shared test utilities can be added here.
