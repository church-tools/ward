
export function trimPastedStrings() {
    document.addEventListener('paste', (e: ClipboardEvent) => {
        const clipboard = e.clipboardData || (<any>e)['originalEvent'].clipboardData;
        if (clipboard.types[0] !== 'text/plain') { return }
        const pastedData = clipboard.getData('text/plain');
        e.preventDefault();
        if (document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, pastedData.trim());
        } else {
            document.execCommand('paste', false, pastedData.trim());
        }
    });
}

export async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
}