import { wait } from "./flow-control-utils";


export function getChildInputElement(element: HTMLElement | null): HTMLInputElement | null {
    if (!element) return null;
    const input = element.querySelector('input, textarea, select');
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)
        return input as HTMLInputElement;
    return null;
}

export async function transitionStyle(element: HTMLElement, from: Partial<CSSStyleDeclaration>, to: Partial<CSSStyleDeclaration>, durationMs: number, transitionFn = 'ease', clear = false): Promise<void> {
    for (const prop in from)
        (element.style as any)[prop] = from[prop];
    const prevTransition = element.style.transition;
    element.style.transition = 'none';
    element.offsetHeight;
    element.style.transition = `all ${durationMs}ms ${transitionFn}`;
    for (const prop in to)
        (element.style as any)[prop] = to[prop];
    await wait(durationMs);
    element.style.transition = prevTransition;
    if (clear)
        for (const prop in to)
            (element.style as any)[prop] = '';
}