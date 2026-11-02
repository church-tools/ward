import { describe, expect, it } from 'vitest';
import { PALETTE_COLORS, randomColorPair } from './color-utils';

describe('randomColorPair', () => {
    it('picks both colors from the palette', () => {
        for (let i = 0; i < 100; i++) {
            const { color_1, color_2 } = randomColorPair();
            expect(PALETTE_COLORS).toContain(color_1);
            expect(PALETTE_COLORS).toContain(color_2);
        }
    });

    it('keeps the second color within 4 steps of the first, and never equal to it', () => {
        const size = PALETTE_COLORS.length;
        for (let i = 0; i < 100; i++) {
            const { color_1, color_2 } = randomColorPair();
            const distance = Math.abs(PALETTE_COLORS.indexOf(color_1) - PALETTE_COLORS.indexOf(color_2));
            const steps = Math.min(distance, size - distance);
            expect(steps).toBeGreaterThan(0);
            expect(steps).toBeLessThanOrEqual(4);
        }
    });
});
