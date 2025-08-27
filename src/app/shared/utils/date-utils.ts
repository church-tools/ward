

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

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