
export const SEMANTIC_COLORS = [
    "accent",
    "accent-variation-1",
    "accent-variation-2",
    "success",
    "warning",
    "danger",
] as const;

export const PALETTE_COLORS = [
    "palevioletred",
    "red",
    "tomato",
    "coral",
    "chocolate",
    "orange",
    "goldenrod",
    "yellow",
    "yellowgreen",
    "lawngreen",
    "green",
    "aquamarine",
    "turquoise",
    "teal",
    "powderblue",
    "skyblue",
    "steelblue",
    "dodgerblue",
    "royalblue",
    "blue",
    "mediumpurple",
    "indigo",
    "magenta",
    "deeppink",
] as const;

export type PaletteColor = typeof PALETTE_COLORS[number];
export type ColorName = typeof SEMANTIC_COLORS[number] | PaletteColor;

export const randomColor = () => PALETTE_COLORS[Math.floor(Math.random() * PALETTE_COLORS.length)];

export function randomColorPair(maxDistance = 4) {
    const first = Math.floor(Math.random() * PALETTE_COLORS.length);
    const steps = 1 + Math.floor(Math.random() * maxDistance);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const second = (first + steps * direction + PALETTE_COLORS.length) % PALETTE_COLORS.length;
    return { color_1: PALETTE_COLORS[first], color_2: PALETTE_COLORS[second] };
};
