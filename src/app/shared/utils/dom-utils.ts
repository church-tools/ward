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

export function attachScript(document: Document, src: string, options?: { async?: boolean; defer?: boolean }) {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
        const alreadyLoaded = existing.dataset['loaded'] === 'true' || (existing as any).readyState === 'complete';
        if (alreadyLoaded) return Promise.resolve(existing);
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => {
                existing.dataset['loaded'] = 'true';
                resolve(existing);
            }, { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
        });
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = options?.async ?? false;
    script.defer = options?.defer ?? false;
    return new Promise((resolve, reject) => {
        script.addEventListener('load', () => {
            script.dataset['loaded'] = 'true';
            resolve(script);
        }, { once: true });
        script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}
