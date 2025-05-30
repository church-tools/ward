
export function generateUUIDv7() {
    const now = Date.now(); // Current timestamp in milliseconds
    const unixTime = Math.floor(now / 1000).toString(16).padStart(8, '0'); // 32-bit seconds
    const subSeconds = ((now % 1000) * 0x1000).toString(16).padStart(5, '0'); // 12-bit sub-seconds

    const random = crypto.getRandomValues(new Uint8Array(10)); // 80 bits of randomness
    const randomHex = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${unixTime}-${subSeconds}-7${randomHex.slice(0, 3)}-${randomHex.slice(3, 7)}-${randomHex.slice(7)}`;
}
