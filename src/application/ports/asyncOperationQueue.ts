export type AsyncOperationQueue = {
  run<T>(operation: () => Promise<T>): Promise<T>;
};

export function createAsyncOperationQueue(): AsyncOperationQueue {
  let pending: Promise<void> = Promise.resolve();
  return {
    run<T>(operation: () => Promise<T>) {
      const result = pending.then(operation);
      pending = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
