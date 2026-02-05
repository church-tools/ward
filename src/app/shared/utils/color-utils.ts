
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
