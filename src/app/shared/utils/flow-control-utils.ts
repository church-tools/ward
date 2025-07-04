
export function wait(ms = 100) {
    return new Promise<void>(res => setTimeout(res, ms));
}
    
const executionTimes = new Map<() => any, number>();

export function executeOnce<T>(callback: () => T, threshold = 250): T | null {
    const lastExecutionTime = executionTimes.get(callback) || 0;
    const now = Date.now();
    if (now - lastExecutionTime < threshold)
        return null; // Skip execution if within threshold
    executionTimes.set(callback, now);
    return callback();
}

export class Lock {
    
    private locks = 0;
    private readonly queue: ((success: boolean) => void)[] = [];

    constructor(private readonly concurrentExecutions = 1) {}

    async lock<R>(callback?: () => Promise<R>): Promise<R | null> {
        try {
            if (this.locks >= this.concurrentExecutions
                && !await new Promise<boolean>(resolve => this.queue.push(resolve)))
                return null;
            this.locks++;
            const result = await callback?.();
            this.locks--;
            this.queue.shift()?.(true);
            return result ?? null;
        } catch (e) {
            this.locks--;
            this.queue.shift()?.(true);
            throw e;
        }
    }

    hasLocks() {
        return this.locks > 0;
    }

    discardPending() {
        for (const resolve of this.queue)
            resolve(false);
        this.queue.length = 0; 
    }
}

export class Mutex {

    private locked = false;
    private waiting: ((success: boolean) => void)[] = [];

    async acquire(): Promise<void> {
        if (this.locked)
            await new Promise<boolean>(resolve => this.waiting.push(resolve));
        this.locked = true;
    }

    async wait(): Promise<void> {
        if (this.locked)
            await new Promise<boolean>(resolve => this.waiting.push(resolve));
    }

    release() {
        if (!this.locked) return;
        this.locked = false;
        const next = this.waiting.shift();
        next?.(true);
    }
}