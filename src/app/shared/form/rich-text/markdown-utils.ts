
type Mapping = { md: [string, string], html: [string, string] };

const mappings: Mapping[] = [
    { md: ['__', '__'], html: ['<strong>', '</strong>'] }, // Bold
    { md: ['_', '_'], html: ['<em>', '</em>'] }, // Italic
    { md: ['~~', '~~'], html: ['<s>', '</s>'] }, // Strikethrough
    { md: ['<u>', '</u>'], html: ['<u>', '</u>'] }, // Underline
    { md: ['[', ']'], html: ['<a>', '</a>'] } // Link
] as const;


export function markdownToQuillHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';
    let html = markdown;
    for (let i = 1; i <= 3; i++)
        html = html.replace(new RegExp(`^#{${i}} (.*$)`, 'gim'), `<h${i}>$1</h${i}>`);
    for (const mapping of mappings)
        html = html.replace(new RegExp(mapping.md[0] + '(.*?)' + mapping.md[1], 'gim'), mapping.html[0] + '$1' + mapping.html[1]);
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
    
    html = processLists(html);
    
    // Convert remaining newlines to <br>
    html = html.replace(/\n/gim, '<br>');
    
    // Clean up consecutive lists and excessive line breaks
    html = html.replace(/<\/ul><br><ul>/gim, '')
        .replace(/<\/ol><br><ol>/gim, '')
        .replace(/<br><br>/gim, '<br>')
        .replace(/^<br>|<br>$/gim, ''); // Remove leading/trailing breaks
    
    return html;
}

export function quillHtmlToMarkdown(html: string): string {
    if (!html || typeof html !== 'string') return '';
    
    // Basic sanitization - remove script tags and other potentially dangerous elements
    const sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '');
    
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = sanitized;
    
    return processNodeToMarkdown(temp).trim();
}

function processLists(text: string): string {
    // Split by actual newlines, not <br> tags
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check for unordered list
        if (line.match(/^\- (.+)$/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\- (.+)$/)) {
                listItems.push(lines[i].trim().replace(/^\- (.+)$/, '<li>$1</li>'));
                i++;
            }
            result.push(`<ul>${listItems.join('')}</ul>`);
            continue;
        }
        
        // Check for ordered list
        if (line.match(/^\d+\. (.+)$/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\d+\. (.+)$/)) {
                listItems.push(lines[i].trim().replace(/^\d+\. (.+)$/, '<li>$1</li>'));
                i++;
            }
            result.push(`<ol>${listItems.join('')}</ol>`);
            continue;
        }
        
        result.push(lines[i]);
        i++;
    }
    
    return result.join('\n');
}

function processNodeToMarkdown(node: Node): string {
    let result = '';
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const textContent = Array.from(element.childNodes).map(child => processNodeToMarkdown(child)).join('');
        
        switch (tagName) {
            case 'h1': case 'h2': case 'h3':
                // Clean any existing header symbols from the text content
                const cleanText = textContent.replace(/^#+\s*/, '');
                const level = parseInt(tagName.charAt(1));
                const hashes = '#'.repeat(level);
                result = `${hashes} ${cleanText}\n`;
                break;
            case 'strong': case 'b':
                result = `**${textContent}**`;
                break;
            case 'em': case 'i':
                result = `_${textContent}_`;
                break;
            case 'u':
                result = `<u>${textContent}</u>`;
                break;
            case 'del':
            case 's':
                result = `~~${textContent}~~`;
                break;
            case 'code':
                result = `\`${textContent}\``;
                break;
            case 'a':
                const href = (element as HTMLAnchorElement).href || '';
                result = `[${textContent}](${href})`;
                break;
            case 'ul':
                result = Array.from(element.children).map(li => {
                    const content = processNodeToMarkdown(li);
                    return indentMarkdownList(content, '- ', 0);
                }).join('') + '\n';
                break;
            case 'ol':
                result = Array.from(element.children).map((li, index) => {
                    const content = processNodeToMarkdown(li);
                    return indentMarkdownList(content, `${index + 1}. `, 0);
                }).join('') + '\n';
                break;
            case 'li':
                result = textContent;
                break;
            case 'br':
                result = '\n';
                break;
            case 'p':
                result = textContent + '\n';
                break;
            case 'div':
                // Treat div as paragraph if it has content
                result = textContent ? textContent + '\n' : '';
                break;
            default:
                result = textContent;
        }
    } else {
        // Process child nodes for other node types
        Array.from(node.childNodes).forEach(child => {
            result += processNodeToMarkdown(child);
        });
    }
    
    return result;
}

function indentMarkdownList(content: string, prefix: string, level: number = 0): string {
    const indent = '  '.repeat(level);
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return '';
    
    // Handle the first line with the prefix
    let result = `${indent}${prefix}${lines[0]}\n`;
    
    // Handle continuation lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('- ') || /^\d+\. /.test(line)) {
            // This is a nested list item - add extra indentation
            result += `${indent}  ${line}\n`;
        } else if (line.trim()) {
            // This is continuation content - align with list item content
            result += `${indent}  ${line}\n`;
        }
    }
    
    return result;
}
