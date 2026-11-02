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
});
