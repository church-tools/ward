import Quill, { Range } from "quill";

export type SelectionFormats = { selection: Range; formats: Record<string, any> };

export async function withSelection(
    quillPromise: Promise<Quill>,
    action: (quill: Quill, selection: Range, formats: Record<string, any>) => void
) {
    const quill = await quillPromise;
    const selection = quill.getSelection();
    if (!selection) return;
    const formats = quill.getFormat(selection) as Record<string, any>;
    action(quill, selection, formats);
}

export function getSelectionFormats(quill: Quill | null | undefined): SelectionFormats | null {
    if (!quill) return null;
    const selection = quill.getSelection();
    if (!selection) return null;
    return { selection, formats: quill.getFormat(selection) as Record<string, any> };
}

export function markUserEditing(
    onStart: () => void,
    onStop: () => void,
    timeoutRef: { current: ReturnType<typeof setTimeout> | null },
    delayMs: number
) {
    onStart();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onStop();
    }, delayMs);
}
