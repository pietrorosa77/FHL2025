export const DEFAULT_CANVAS_WIDTH = 4000;
export const DEFAULT_CANVAS_HEIGHT = 4000;

export interface CanvasDimensionsProvider {
  getCanvasWidth(): number;
  getCanvasHeight(): number;
}

export class StaticCanvasDimensions implements CanvasDimensionsProvider {
  getCanvasWidth() { return DEFAULT_CANVAS_WIDTH; }
  getCanvasHeight() { return DEFAULT_CANVAS_HEIGHT; }
}

export const defaultCanvasDimensions = new StaticCanvasDimensions();
