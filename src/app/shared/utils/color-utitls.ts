export type ColorName = 'accent' | 'success' | 'warning' | 'danger' | 'gray'
    | 'red' | 'pink' | 'berry' | 'purple' | 'lavender' | 'navy' | 'blue' | 'teal' | 'seafoam' | 'green' | 'forest' | 'yellowgreen' | 'yellow' | 'brass' | 'mustard' | 'peach' | 'orange';


const huesByName: { [name: string]: number } = {
    'red': 356,
    'pink': 322,
    'berry': 307,
    'purple': 268,
    'lavender': 247,
    'navy': 227,
    'blue': 206,
    'teal': 182,
    'seafoam': 151,
    'green': 120,
    'forest': 87,
    'yellowgreen': 67,
    'yellow': 54,
    'brass': 43,
    'mustard': 38,
    'peach': 33,
    'orange': 16,
} as const;

const colorsByName: { [name: string]: string } = {
    'success': '#107c10',
    'warning': '#f7630c',
    'danger': '#c50f1f',
    'gray': '#6c757d',
    'red': '#d13438',
    'pink': '#e43ba6',
    'berry': '#c238b2',
    'purple': '#5c2e91',
    'lavender': '#7160e8',
    'navy': '#0027b4',
    'blue': '#0078d4',
    'teal': '#038387',
    'seafoam': '#00cc6a',
    'green': '#107c10',
    'forest': '#498205',
    'yellowgreen': '#a3b202',
    'yellow': '#fde300',
    'brass': '#986f0b',
    'mustard': '#c67c06',
    'peach': '#ff8c00',
    'orange': '#da3b01',
} as const;

/**
 * 
 * @param colorName The name of the color to get the shade for.
 * @param shade between 0 and 200, where 100 is the base color and 0 is the darkest shade (black) and 200 is the lightest (white).
 * @returns 
 */
export function getColorShade(colorName: ColorName, shade: number): string {
    const color = colorsByName[colorName];
    if (shade === 100) return color;
    if (shade < 0 || shade > 200) {
        throw new Error(`Invalid shade: ${shade}. Must be between 0 and 200.`);
    }
    
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    // Adjust lightness based on shade
    // shade 0 = lightness 0 (black)
    // shade 100 = original lightness
    // shade 200 = lightness 1 (white)
    let newL: number;
    if (shade < 100) {
        // Darker shades: interpolate between 0 and original lightness
        newL = l * (shade / 100);
    } else {
        // Lighter shades: interpolate between original lightness and 1
        newL = l + (1 - l) * ((shade - 100) / 100);
    }
    
    
    let newR: number, newG: number, newB: number;
    
    if (s === 0) {
        newR = newG = newB = newL; // achromatic
    } else {
        const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
        const p = 2 * newL - q;
        newR = hue2rgbChannel(p, q, h + 1/3);
        newG = hue2rgbChannel(p, q, h);
        newB = hue2rgbChannel(p, q, h - 1/3);
    }
    return `#${rgbChannelToHex(newR)}${rgbChannelToHex(newG)}${rgbChannelToHex(newB)}`;
}

function hue2rgbChannel(p: number, q: number, t: number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

function rgbChannelToHex(c: number): string {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}