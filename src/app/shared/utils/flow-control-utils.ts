
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