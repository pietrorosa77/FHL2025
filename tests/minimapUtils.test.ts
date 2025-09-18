import { describe, it, expect } from 'vitest';
import { computeMinimapScale, mapBlockToMinimap } from '../src/MinimapManager.js';

describe('Minimap utilities', () => {
  it('computes scale and maps block correctly', () => {
    const { scaleX, scaleY } = computeMinimapScale(200, 200, 4000, 4000);
    expect(scaleX).toBeCloseTo(0.05, 5);
    const block = { id:'b', kind:'process', position:{x:2000,y:1500}, size:{width:100,height:80}, title:'b', descriptionHtml:'', properties:{} };
    const m = mapBlockToMinimap(block as any, scaleX, scaleY);
    expect(m.x).toBeCloseTo(100, 2); // 2000 * .05
    expect(m.y).toBeCloseTo(75, 2);  // 1500 * .05
    expect(m.w).toBeCloseTo(5, 2);   // 100 * .05
    expect(m.h).toBeCloseTo(4, 2);   // 80 * .05
  });
});
