
import { getInlineHtmlReplacements, getInlinePlaintextReplacements } from "./inline-format-utils";
import { applyReplacements, convertLinesToHtml, replaceHeadersWithColors } from "./markdown-html-utils";
import { markdownListsToHtml } from "./list-utils";
import { quillHtmlToMarkdownText } from "./markdown-dom-utils";

export type HTMLString = string & { __htmlStringBrand: never };

type Replacement = { pattern: RegExp; replace: string };

const HEADER_LEVELS = [1, 2, 3] as const;
const INLINE_HTML_REPLACEMENTS: Replacement[] = getInlineHtmlReplacements();

const COLOR_HTML_REPLACEMENTS: Replacement[] = [
    {
        pattern: /<highlight:([^>]+)-bg>(.*?)<\/highlight>/gs,
        replace: '<span class="ql-bg-$1 highlighted" data-background="$1">$2</span>'
    },
    {
        pattern: /<color:([^>]+)-bg>(.*?)<\/color>/gs,
        replace: '<span class="ql-bg-$1 highlighted" data-background="$1">$2</span>'
    },
    {
        pattern: /<color:([^>]+)>(.*?)<\/color>/gs,
        replace: '<span class="ql-color-$1" data-color="$1">$2</span>'
    }
];

const PLAINTEXT_REPLACEMENTS: Replacement[] = [
    ...getInlinePlaintextReplacements(),
    { pattern: /#+ (.*)/g, replace: '$1' },
    { pattern: /<color:[^>]+>(.*?)<\/color>/g, replace: '$1' },
    { pattern: /<highlight:[^>]+-bg>(.*?)<\/highlight>/g, replace: '$1' }
];

export function markdownToQuillHtml(markdown: string): HTMLString {
    if (!markdown || typeof markdown !== 'string') return '' as HTMLString;

    let html = markdown;

    html = replaceHeadersWithColors(html, HEADER_LEVELS);
    html = applyReplacements(html, INLINE_HTML_REPLACEMENTS);
    html = applyReplacements(html, COLOR_HTML_REPLACEMENTS);

    html = markdownListsToHtml(html);
    return convertLinesToHtml(html);
}

export function quillHtmlToMarkdown(html: HTMLString | null): string {
    if (!html || typeof html !== 'string') return '';
    return quillHtmlToMarkdownText(html);
}

export function markdownToPlainText(markdown: string | null): string {
    if (!markdown) return '';
    return applyReplacements(markdown, PLAINTEXT_REPLACEMENTS)
        .replaceAll('- ', '• ')
        .trim();
}


