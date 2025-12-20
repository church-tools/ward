import { wait } from "./flow-control-utils";


export function getChildInputElement(element: HTMLElement | null): HTMLInputElement | null {
    if (!element) return null;
    const input = element.querySelector('input, textarea, select');
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)
        return input as HTMLInputElement;
    return null;
}

export async function transitionStyle(element: HTMLElement,
    from: Partial<CSSStyleDeclaration>,
    to: Partial<CSSStyleDeclaration>,
    durationMs: number, transitionFn = 'ease', clear = false
): Promise<void> {
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

export type EnsureHeadElementResult<T extends HTMLElement> = {
    element: T;
    created: boolean;
    cleanup: () => void;
};

export function ensureScript(document: Document, src: string, options?: { async?: boolean; defer?: boolean }): EnsureHeadElementResult<HTMLScriptElement> {
    const selector = `script[src="${src}"]`;
    return ensureHeadElement(document, selector, () => {
        const script = document.createElement('script');
        script.src = src;
        script.async = options?.async ?? false;
        script.defer = options?.defer ?? false;
        return script;
    });
}

function ensureHeadElement<T extends HTMLElement>(document: Document, selector: string, create: () => T): EnsureHeadElementResult<T> {
    const existing = document.head.querySelector(selector);
    if (existing instanceof HTMLElement)
        return { element: existing as T, created: false, cleanup: () => { } };
    const element = create();
    document.head.appendChild(element);
    return { element, created: true, cleanup: () => element.remove() };
}