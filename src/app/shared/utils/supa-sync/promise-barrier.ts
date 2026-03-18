
export class PromiseBarrier<T = void> {
    private settled = false;
    private resolveFunc!: (value: T | PromiseLike<T>) => void;
    private rejectFunc!: (reason?: any) => void;
    public readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolveFunc = resolve;
            this.rejectFunc = reject;
        });
    }

    public resolve(value?: T): void {
        if (this.settled) return;
        this.settled = true;
        this.resolveFunc(value as T);
    }

    public reject(error: unknown): void {
        if (this.settled) return;
        this.settled = true;
        this.rejectFunc(error);
    }

    public settle(error?: unknown): void {
        if (error === undefined)
            this.resolve();
        else
            this.reject(error);
    }
}
