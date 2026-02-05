import { Delta } from "quill";

export const TOOLBAR = {
    width: 480,
    height: 48,
    padding: 8,
    halfWidth: 480 / 2,
};

export function createClipboardColorMatcher(colorClassSet: Set<string>, bgClassSet: Set<string>) {
    return (node: Node, delta: Delta) => {
        if (!(node instanceof HTMLElement)) return delta;
        let colorClass: string | undefined;
        let bgClass: string | undefined;
        const dataColor = node.getAttribute('data-color') || undefined;
        const dataBackground = node.getAttribute('data-background') || undefined;
        for (const cls of Array.from(node.classList)) {
            if (!colorClass && colorClassSet.has(cls)) colorClass = cls;
            if (!bgClass && bgClassSet.has(cls)) bgClass = cls;
            if (!colorClass && cls.startsWith('ql-color-')) colorClass = cls.replace('ql-color-', '') + '-active';
            if (!bgClass && cls.startsWith('ql-bg-')) bgClass = cls.replace('ql-bg-', '') + '-bg';
        }
        if (!colorClass && !bgClass) return delta;
        const attributes: Record<string, string> = {};
        if (colorClass || dataColor) attributes['color'] = (dataColor || colorClass)?.replace(/-active$/, '')!;
        if (bgClass || dataBackground) attributes['background'] = (dataBackground || bgClass)?.replace(/-bg$/, '')!;
        const retainDelta = new Delta().retain(delta.length(), attributes);
        return delta.compose(retainDelta);
    };
}

export function preserveDeltaSpaces(delta: Delta): Delta {
    if (!delta.ops) return delta;
    delta.ops = delta.ops.map(op => {
        if (typeof op.insert === 'string') {
            return {
                ...op,
                insert: op.insert.replace(/ {2,}/g, match => ` ${'\u00a0'.repeat(match.length - 1)}`)
            };
        }
        return op;
    });
    return delta;
}

export function normalizeHtml(html: string): string {
    return html
        .replace(/>\s+</g, '><')
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/<p><br><\/p>/gi, '<p></p>')
        .trim();
}

export function setMinHeight(element: HTMLDivElement, minLines: number) {
    const lineHeight = 1.5;
    const fontSize = 14;
    const padding = 5 * 2;
    const minHeight = (minLines * fontSize * lineHeight) + padding;
    element.style.minHeight = `${minHeight}px`;
}

export function clampToViewport(value: number, halfSize: number, padding: number, max: number): number {
    const min = halfSize + padding;
    return clamp(value, min, Math.max(min, max - halfSize - padding));
}

export function getPopoverOffset(
    editorBounds: DOMRect,
    selectionBounds: { left: number; top: number; width: number; height: number },
    viewportWidth: number,
    viewportHeight: number,
): [number, number] {
    const anchorCenterX = editorBounds.left + (editorBounds.width / 2);

    const desiredCenterX = editorBounds.left + selectionBounds.left + (selectionBounds.width / 2);
    const clampedCenterX = clampToViewport(desiredCenterX, TOOLBAR.halfWidth, TOOLBAR.padding, viewportWidth);
    const left = clampedCenterX - anchorCenterX;

    const desiredTop = editorBounds.top + selectionBounds.top;
    const clampedTop = clampToViewport(desiredTop, TOOLBAR.height, TOOLBAR.padding, viewportHeight);
    const top = clampedTop - editorBounds.top;

    return [Math.round(left), Math.round(top)];
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
