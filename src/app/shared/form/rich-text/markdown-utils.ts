
export type HTMLString = string & { __htmlStringBrand: never };

export function markdownToQuillHtml(markdown: string): HTMLString {
    if (!markdown || typeof markdown !== 'string') return '' as HTMLString;
    
    let html = markdown;
    
    // Convert headers
    for (let i = 1; i <= 3; i++) {
        html = html.replace(new RegExp(`^#{${i}} (.*$)`, 'gim'), `<h${i}>$1</h${i}>`);
    }
    
    // Convert inline formatting
    html = html.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)_([^_\n]+?)_(?!\*)/g, '<em>$1</em>');
    html = html.replace(/~~([^~\n]+?)~~/g, '<s>$1</s>');
    html = html.replace(/<u>([^<\n]+?)<\/u>/g, '<u>$1</u>');
    html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
    
    // Convert color and highlight (use non-greedy matching for nested content)
    html = html.replace(/<color:([^>]+)>(.*?)<\/color>/gs, '<span style="color:$1">$2</span>');
    html = html.replace(/<highlight:([^>]+)>(.*?)<\/highlight>/gs, '<span style="background-color:$1">$2</span>');
    
    html = convertMarkdownLists(html);
    return convertLinesToHtml(html);
}

export function quillHtmlToMarkdown(html: HTMLString | null): string {
    if (!html || typeof html !== 'string') return '';
    const sanitized = sanitizeHtml(html);
    const temp = document.createElement('div');
    temp.innerHTML = convertQuillLists(sanitized);
    return cleanupMarkdown(processNode(temp));
}

export function markdownToPlainText(markdown: string | null): string {
    if (!markdown) return '';
    return markdown.replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // italic
        .replace(/~~(.*?)~~/g, '$1') // strikethrough
        .replace(/`(.*?)`/g, '$1') // inline code
        .replace(/<u>(.*?)<\/u>/g, '$1') // underline
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // links
        .replace(/#+ (.*)/g, '$1') // headers
        .replace(/<color:[^>]+>(.*?)<\/color>/g, '$1') // color
        .replace(/<highlight:[^>]+>(.*?)<\/highlight>/g, '$1') // highlight
        .replaceAll('- ', '• ') // unordered list items
        .trim();
}

function convertLinesToHtml(html: string): HTMLString {
    const lines = html.split('\n');
    const result: string[] = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            // Preserve blank lines as empty paragraphs with a line break
            result.push('<p><br></p>');
            continue;
        }
        
        if (isBlockElement(trimmed)) {
            result.push(trimmed);
        } else {
            result.push(`<p>${trimmed}</p>`);
        }
    }
    
    return result.join('')
        .replace(/<\/ul><p><br><\/p><ul>/gim, '')
        .replace(/<\/ol><p><br><\/p><ol>/gim, '') as HTMLString;
}

function isBlockElement(line: string): boolean {
    return line.match(/^<\/(h[1-6]|ul|ol|li|div|p)>/) !== null ||
           line.match(/^<(h[1-6]|ul|ol|li|div|p)(\s|>)/) !== null;
}

function sanitizeHtml(html: HTMLString): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<span class="ql-ui"[^>]*><\/span>/gi, '');
}

function cleanupMarkdown(result: string): string {
    return result
        .replace(/\n{4,}/g, '\n\n\n') // Allow up to 2 blank lines (3 newlines), but no more
        .replace(/^# ([^\n]+)\n\n\n/gm, '# $1\n\n')
        .replace(/^\n+|\n+$/g, '')
        .trim();
}

function convertMarkdownLists(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        if (line.match(/^\- (.+)$/)) {
            const items: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\- (.+)$/)) {
                items.push(lines[i].trim().replace(/^\- (.+)$/, '<li>$1</li>'));
                i++;
            }
            result.push(`<ul>${items.join('')}</ul>`);
            continue;
        }
        
        if (line.match(/^\d+\. (.+)$/)) {
            const items: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\d+\. (.+)$/)) {
                items.push(lines[i].trim().replace(/^\d+\. (.+)$/, '<li>$1</li>'));
                i++;
            }
            result.push(`<ol>${items.join('')}</ol>`);
            continue;
        }
        
        result.push(lines[i]);
        i++;
    }
    
    return result.join('\n');
}

function convertQuillLists(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('ol, ul').forEach(list => {
        const items = Array.from(list.querySelectorAll('li[data-list]')).map(li => ({
            element: li.cloneNode(true) as Element,
            type: li.getAttribute('data-list') || '',
            indent: getIndentLevel(li)
        }));
        
        if (items.length === 0) return;
        
        items.forEach(item => {
            item.element.removeAttribute('data-list');
            item.element.classList.remove(...Array.from(item.element.classList).filter(cls => cls.startsWith('ql-indent-')));
        });
        
        const newList = buildNestedList(items);
        if (newList) list.parentNode?.replaceChild(newList, list);
    });
    
    return temp.innerHTML;
}

function getIndentLevel(li: Element): number {
    const indentClass = Array.from(li.classList).find(cls => cls.startsWith('ql-indent-'));
    return indentClass ? parseInt(indentClass.replace('ql-indent-', '')) || 0 : 0;
}

function buildNestedList(items: Array<{ element: Element; type: string; indent: number }>): Element | null {
    if (items.length === 0) return null;
    
    const firstItem = items[0];
    const allSameLevel = items.every(item => item.indent === firstItem.indent);
    const allSameType = items.every(item => item.type === firstItem.type);
    
    if (allSameLevel && allSameType) {
        const listTag = firstItem.type === 'ordered' ? 'ol' : 'ul';
        const list = document.createElement(listTag);
        items.forEach(item => list.appendChild(item.element));
        return list;
    }
    
    const stack: { list: Element; indent: number; type: string }[] = [];
    let root: Element | null = null;
    
    items.forEach(item => {
        const listTag = item.type === 'ordered' ? 'ol' : 'ul';
        
        while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
            stack.pop();
        }
        
        const needsNewList = stack.length === 0 || 
                           stack[stack.length - 1].indent < item.indent || 
                           stack[stack.length - 1].type !== item.type;
                           
        if (needsNewList) {
            const newList = document.createElement(listTag);
            
            if (stack.length === 0) {
                root = newList;
            } else {
                const parentList = stack[stack.length - 1].list;
                const lastItem = parentList.lastElementChild;
                if (lastItem) lastItem.appendChild(newList);
            }
            
            stack.push({ list: newList, indent: item.indent, type: item.type });
        }
        
        stack[stack.length - 1].list.appendChild(item.element);
    });
    
    return root;
}

function processNode(node: Node, indent = 0): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
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
    switch (tag) {
        case 'h1': case 'h2': case 'h3':
            const level = parseInt(tag.charAt(1));
            return `${'#'.repeat(level)} ${content.replace(/^#+\s*/, '')}\n\n`;
        case 'strong': case 'b': return `**${content}**`;
        case 'em': case 'i': return `_${content}_`;
        case 'u': return `<u>${content}</u>`;
        case 'del': case 's': return `~~${content}~~`;
        case 'code': return `\`${content}\``;
        case 'a': 
            const href = (element as HTMLAnchorElement).href || '';
            return `[${content}](${href})`;
        case 'br': return '\n';
        case 'p': return content.trim() ? content.trim() + '\n' : '\n'; // Empty p = blank line
        case 'div': return content.trim() ? content.trim() + '\n' : '\n';
        case 'span':
            const style = element.getAttribute('style') || '';
            const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
            const bgMatch = style.match(/background-color:\s*([^;]+)/i);
            if (colorMatch) {
                return `<color:${colorMatch[1].trim()}>${content}</color>`;
            }
            if (bgMatch) {
                return `<highlight:${bgMatch[1].trim()}>${content}</highlight>`;
            }
            return content;
        case 'ul':
            const ulItems = Array.from(element.children)
                .map(li => processListItem(li, '- ', indent))
                .join('');
            return ulItems + (indent === 0 ? '\n' : '');
        case 'ol':
            const olItems = Array.from(element.children)
                .map((li, i) => processListItem(li, `${i + 1}. `, indent))
                .join('');
            return olItems + (indent === 0 ? '\n' : '');
        case 'li': return content.trim();
        default: return content;
    }
}

function processListItem(li: Element, prefix: string, indent: number): string {
    const spaces = '  '.repeat(indent);
    let content = '';
    let hasNested = false;
    
    Array.from(li.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = (child as Element).tagName.toLowerCase();
            if (tag === 'ul' || tag === 'ol') {
                hasNested = true;
                content += '\n' + processNode(child, indent + 1);
            } else {
                content += processNode(child, indent);
            }
        } else {
            content += processNode(child, indent);
        }
    });
    
    if (hasNested) {
        const lines = content.trim().split('\n');
        const firstLine = lines[0] || '';
        const restLines = lines.slice(1).map(line => {
            const trimmed = line.trim();
            return trimmed.match(/^[-\d]+\.?\s/) ? line : `${spaces}  ${trimmed}`;
        }).join('\n');
        
        return `${spaces}${prefix}${firstLine}\n${restLines}\n`;
    }
    
    return `${spaces}${prefix}${content.trim()}\n`;
}
