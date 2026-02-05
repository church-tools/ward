import { quillHtmlListsToMarkdown } from "./list-utils";

export function quillHtmlToMarkdownText(html: string): string {
    const sanitized = sanitizeHtml(html);
    const temp = document.createElement('div');
    temp.innerHTML = quillHtmlListsToMarkdown(sanitized);
    return cleanupMarkdown(processNode(temp));
}

function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<span class="ql-ui"[^>]*><\/span>/gi, '');
}

function cleanupMarkdown(result: string): string {
    return result
        .replace(/\n{4,}/g, '\n\n\n')
        .replace(/^# ([^\n]+)\n\n\n/gm, '# $1\n\n')
        .replace(/^\n+|\n+$/g, '')
        .trim();
}

function processNode(node: Node, indent = 0): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').replace(/\u00a0/g, ' ');
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tag = element.tagName.toLowerCase();
        const content = Array.from(element.childNodes)
            .map(child => processNode(child, indent))
            .join('');

        return processElementTag(tag, content, element, indent);
    }

    return Array.from(node.childNodes)
        .map(child => processNode(child, indent))
        .join('');
}

function processElementTag(tag: string, content: string, element: Element, indent: number): string {
    const colorTags = getColorTags(element);
    const wrap = (value: string) => wrapWithColor(value, colorTags);

    switch (tag) {
        case 'h1': case 'h2': case 'h3':
            const level = parseInt(tag.charAt(1));
            return wrap(`${'#'.repeat(level)} ${content.replace(/^#+\s*/, '')}`) + '\n';
        case 'strong': case 'b': return `**${content}**`;
        case 'em': case 'i': return `_${content}_`;
        case 'u': return `<u>${content}</u>`;
        case 'del': case 's': return `~~${content}~~`;
        case 'code': return `\`${content}\``;
        case 'a':
            const href = (element as HTMLAnchorElement).href || '';
            return `[${content}](${href})`;
        case 'br': return '\n';
        case 'p':
        case 'div':
            return content.trim() ? wrap(content.trim()) + '\n' : '\n';
        case 'span':
            return wrap(content);
        case 'ul':
            return listToMarkdown(element, indent, false);
        case 'ol':
            return listToMarkdown(element, indent, true);
        case 'li': return wrap(content.trim());
        default: return content;
    }
}

function listToMarkdown(element: Element, indent: number, ordered: boolean): string {
    const items = Array.from(element.children)
        .map((li, i) => processListItem(li, ordered ? `${i + 1}. ` : '- ', indent))
        .join('');
    return items + (indent === 0 ? '\n' : '');
}

function processListItem(li: Element, prefix: string, indent: number): string {
    const spaces = '  '.repeat(indent);
    const { content, hasNested } = readListItemContent(li, indent);

    if (hasNested) {
        return formatNestedListItem(spaces, prefix, content);
    }

    return `${spaces}${prefix}${content.trim()}\n`;
}

function readListItemContent(li: Element, indent: number): { content: string; hasNested: boolean } {
    let hasNested = false;
    const parts = Array.from(li.childNodes).map(child => {
        if (isListNode(child)) {
            hasNested = true;
            return `\n${processNode(child, indent + 1)}`;
        }

        return processNode(child, indent);
    });

    return { content: parts.join(''), hasNested };
}

function isListNode(node: Node): node is Element {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = (node as Element).tagName.toLowerCase();
    return tag === 'ul' || tag === 'ol';
}

function formatNestedListItem(spaces: string, prefix: string, content: string): string {
    const lines = content.trim().split('\n');
    const firstLine = lines[0] || '';
    const restLines = lines.slice(1).map(line => {
        const trimmed = line.trim();
        return trimmed.match(/^[-\d]+\.?\s/) ? line : `${spaces}  ${trimmed}`;
    }).join('\n');

    return `${spaces}${prefix}${firstLine}\n${restLines}\n`;
}

type ColorTags = { text?: string; bg?: string };

function getColorTags(element: Element): ColorTags {
    const classList = element.className || '';
    const quillTextMatch = classList.match(/ql-color-([\w-]+)/);
    const quillBgMatch = classList.match(/ql-bg-([\w-]+)/);
    const textColorMatch = classList.match(/([\w-]+)-active/);
    const bgColorMatch = classList.match(/([\w-]+)-bg/);
    return {
        text: quillTextMatch?.[1] ?? textColorMatch?.[1],
        bg: quillBgMatch?.[1] ?? bgColorMatch?.[1],
    };
}

function wrapWithColor(value: string, tags: ColorTags): string {
    if (!value || value.trim().length === 0) return value;
    if (tags.bg && tags.text) {
        return `<highlight:${tags.bg}-bg><color:${tags.text}>${value}</color></highlight>`;
    }
    if (tags.bg) return `<highlight:${tags.bg}-bg>${value}</highlight>`;
    if (tags.text) return `<color:${tags.text}>${value}</color>`;
    return value;
}
