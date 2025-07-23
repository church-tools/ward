

export function markdownToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';
    
    let html = markdown
        // Headers (order matters - longer patterns first)
        .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Clean up any accumulated header symbols
        .replace(/<h([1-6])>#+\s*(.*?)<\/h\1>/gim, '<h$1>$2</h$1>')
        // Bold (process before italic to avoid conflicts)
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.*?)~~/gim, '<del>$1</del>')
        // Underline (HTML)
        .replace(/<u>(.*?)<\/u>/gim, '<u>$1</u>')
        // Code
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
        
    // Process lists before converting newlines
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

export function htmlToMarkdown(html: string): string {
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
    
    try {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            const textContent = Array.from(element.childNodes).map(child => processNodeToMarkdown(child)).join('');
            
            switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                // Clean any existing header symbols from the text content
                const cleanText = textContent.replace(/^#+\s*/, '');
                const level = parseInt(tagName.charAt(1));
                const hashes = '#'.repeat(level);
                result = `${hashes} ${cleanText}\n`;
                break;
            case 'strong':
            case 'b':
                result = `**${textContent}**`;
                break;
            case 'em':
            case 'i':
                result = `_${textContent}_`;
                break;
            case 'u':
                result = `<u>${textContent}</u>`;
                break;
            case 'del':
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
    } catch (error) {
        console.warn('Error processing HTML node to markdown:', error);
        return '';
    }
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
