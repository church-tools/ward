
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type PartialWith<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type PromiseOrValue<T> = T | Promise<T>;
