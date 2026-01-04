

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function getStartOfWeek() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

/*
 * Converts 5 Minute block in week to time
 */
export function blockInWeekToTime(blockInWeek: number) {
    const beginningOfLastSunday = getStartOfWeek();
    return new Date(beginningOfLastSunday.getTime() + blockInWeek * 5 * MINUTE);
}

export function compressTimestamp(time?: number): string {
    let result = '';
    let n = time ?? Date.now();
    if (n === 0) return '0';
    while (n > 0) {
        result = CHARS[n % 62] + result;
        n = Math.floor(n / 62);
    }
    return result;
}
