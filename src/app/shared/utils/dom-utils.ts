

export function getChildInputElement(element: HTMLElement | null): HTMLInputElement | null {
    if (!element) return null;
    const input = element.querySelector('input, textarea, select');
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)
        return input as HTMLInputElement;
    return null;
}