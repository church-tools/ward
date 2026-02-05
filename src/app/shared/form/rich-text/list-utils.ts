type ListItem = { element: Element; type: string; indent: number };

export function markdownListsToHtml(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const unordered = consumeList(lines, i, /^\- (.+)$/, 'ul');
        if (unordered) {
            result.push(unordered.html);
            i = unordered.nextIndex;
            continue;
        }

        const ordered = consumeList(lines, i, /^\d+\. (.+)$/, 'ol');
        if (ordered) {
            result.push(ordered.html);
            i = ordered.nextIndex;
            continue;
        }

        result.push(lines[i]);
        i++;
    }

    return result.join('\n');
}

function consumeList(
    lines: string[],
    startIndex: number,
    pattern: RegExp,
    tag: 'ul' | 'ol'
): { html: string; nextIndex: number } | null {
    if (!lines[startIndex].trim().match(pattern)) return null;

    const items: string[] = [];
    let index = startIndex;
    while (index < lines.length && lines[index].trim().match(pattern)) {
        items.push(lines[index].trim().replace(pattern, '<li>$1</li>'));
        index++;
    }

    return { html: `<${tag}>${items.join('')}</${tag}>`, nextIndex: index };
}

export function quillHtmlListsToMarkdown(html: string): string {
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

function buildNestedList(items: ListItem[]): Element | null {
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
