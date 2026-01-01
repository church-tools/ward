
export function generateHash(length = 4): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(36).padStart(2, '0')).join('');
}
