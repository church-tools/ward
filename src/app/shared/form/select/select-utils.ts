
import type { IconCode } from '@/shared/icon/icon';
import type { ColorName } from '@/shared/utils/color-utils';

export type SelectOption<T> = {
    value: T;
    view: string;
    icon?: IconCode;
    row?: unknown;
    id?: number | string;
    lcText?: string;
    translatedText?: string;
    color?: ColorName;
    group?: {
        id: string;
        label: string;
        color?: ColorName;
    };
};

export type PendingValueTracker<T> = {
    mark: (value: T) => void;
    shouldIgnore: (value: T) => boolean;
    clear: () => void;
};

export function createPendingValueTracker<T>(settleMs = 150): PendingValueTracker<T> {
    let pendingValue: T | undefined = undefined;
    let pendingValueSetAt = 0;

    const clear = () => {
        pendingValue = undefined;
        pendingValueSetAt = 0;
    };

    return {
        mark: (value: T) => {
            pendingValue = value;
            pendingValueSetAt = Date.now();
        },
        shouldIgnore: (value: T) => {
            if (pendingValue === undefined)
                return false;
            if (Object.is(value, pendingValue)) {
                if ((Date.now() - pendingValueSetAt) < settleMs)
                    return true;
                clear();
                return false;
            }
            return true;
        },
        clear,
    };
}

export function shouldFocusInputFromContainerMouseDown(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el)
        return true;
    return !el.closest('button, a, input, textarea, select, [role="button"]');
}

export function schedulePopupCleanup(isRequested: () => boolean, clearFn: () => void, delayMs: number) {
    setTimeout(() => {
        if (isRequested())
            return;
        clearFn();
    }, delayMs);
}
