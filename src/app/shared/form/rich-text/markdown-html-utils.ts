import { HTMLString } from "./markdown-utils";

type Replacement = { pattern: RegExp; replace: string };

const BLOCK_TAG_RE = /^<\/?(h[1-6]|ul|ol|li|div|p)(\s|>)/;

export function applyReplacements(text: string, replacements: Replacement[]): string {
    return replacements.reduce((result, { pattern, replace }) => result.replace(pattern, replace), text);
}

export function convertLinesToHtml(html: string): HTMLString {
    const lines = html.split('\n');
    const result: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            result.push('<p><br></p>');
            continue;
        }

        if (BLOCK_TAG_RE.test(trimmed)) {
            result.push(preserveSpacesInText(trimmed));
        } else {
            result.push(`<p>${preserveSpacesInText(trimmed)}</p>`);
        }
    }

    return result.join('')
        .replace(/<\/ul><p><br><\/p><ul>/gim, '')
        .replace(/<\/ol><p><br><\/p><ol>/gim, '') as HTMLString;
}

function preserveSpacesInText(text: string): string {
    return text
        .split(/(<[^>]+>)/g)
        .map(part => part.startsWith('<') ? part : part.replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length)))
        .join('');
}

export function replaceHeadersWithColors(html: string, levels: readonly number[]): string {
    const variants = [
        { tag: 'color', suffix: '', className: 'ql-color-$1' },
        { tag: 'color', suffix: '-bg', className: 'ql-bg-$1 highlighted' },
        { tag: 'highlight', suffix: '-bg', className: 'ql-bg-$1 highlighted' },
        { tag: 'plain', suffix: '', className: '' },
    ];

    return levels.reduce((result, level) => {
        return variants.reduce((value, variant) => {
            if (variant.tag === 'plain') {
                const pattern = new RegExp(`^#{${level}} (.*$)`, 'gim');
                return value.replace(pattern, `<h${level}>$1</h${level}>`);
            }
            const pattern = new RegExp(`^<${variant.tag}:([\\w-]+)${variant.suffix}>#{${level}} (.*)<\\/${variant.tag}>$`, 'gim');
            return value.replace(pattern, `<h${level}><span class="${variant.className}">$2</span></h${level}>`);
        }, result);
    }, html);
}
