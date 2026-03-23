
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const FIRST_SUNDAY_DATE = (() => {
    const firstSunday = new Date(2000, 0, 2);
    firstSunday.setHours(0, 0, 0, 0);
    return firstSunday;
})();

export type SundayIndex = number & { __brand: 'SundayIndex' };
export type WeekInMonth = number & { __brand: 'WeekInMonth' };

export function getStartOfWeek() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

export function sundayIndexToDate(sundayIndex: SundayIndex): Date {
    return new Date(FIRST_SUNDAY_DATE.getTime() + sundayIndex * WEEK);
}

export function getUpcomingSundayIndex(date = new Date()): SundayIndex {
    const normalizedDate = new Date(date);
    const startOfWeek = new Date(normalizedDate.setDate(normalizedDate.getDate() - normalizedDate.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    return Math.floor((startOfWeek.getTime() - FIRST_SUNDAY_DATE.getTime()) / WEEK) + 1 as SundayIndex;
}

export function getSundayIndexInMonth(weekIndex: SundayIndex) {
    const date = sundayIndexToDate(weekIndex);
    const sundayOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
    sundayOfWeek.setHours(0, 0, 0, 0);
    return Math.ceil(sundayOfWeek.getDate() / 7) as WeekInMonth;
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
