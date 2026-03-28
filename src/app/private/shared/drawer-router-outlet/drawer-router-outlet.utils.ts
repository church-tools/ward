import { animationDurationSmMs } from "@/shared/utils/style";

const INTERACTIVE_ELEMENTS = new Set(['button', 'a', 'input', 'textarea', 'select', 'label', 'app-button']);
const DRAWER_STYLE_PROPERTIES = ['opacity', 'transform', 'transition', 'user-select', 'will-change', 'min-height', 'min-width'];
const CARD_STYLE_PROPERTIES = ['left', 'min-height', 'min-width'];

export function clearTimeoutRef(timeoutRef: number | undefined): undefined {
    if (timeoutRef !== undefined)
        clearTimeout(timeoutRef);
    return undefined;
}

export function getDrawerCard(element: HTMLElement): HTMLElement {
    return element.querySelector('.drawer-card')! as HTMLElement;
}

export function calculateDragOpacity(delta: number): string {
    return `${Math.max(0.3, 1 - delta / animationDurationSmMs)}`;
}

export function applyDrawerDragStyles(element: HTMLElement, delta: number, isBottom: boolean) {
    element.style.transform = `translate${isBottom ? 'Y' : 'X'}(${delta}px)`;
    if (!isBottom)
        element.style.opacity = calculateDragOpacity(delta);
}

export function isCardBackground(element: HTMLElement, drawer: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current && current !== drawer) {
        const tagName = current.tagName.toLowerCase();
        if (INTERACTIVE_ELEMENTS.has(tagName))
            return false;
        if (current.hasAttribute('contenteditable'))
            return false;
        current = current.parentElement;
    }
    return true;
}

function clearInlineStyles(element: HTMLElement, properties: readonly string[]) {
    for (const property of properties)
        element.style.removeProperty(property);
}

export function resetDrawerVisualState(element: HTMLElement, card: HTMLElement | null) {
    clearInlineStyles(element, DRAWER_STYLE_PROPERTIES);
    if (!card)
        return;
    card.classList.remove('fade-out');
    clearInlineStyles(card, CARD_STYLE_PROPERTIES);
}
