import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  selectedProjectId?: number;
}

const requestContext = new AsyncLocalStorage<RequestContextStore>();

export const runWithRequestContext = async <T>(
  store: RequestContextStore,
  callback: () => Promise<T>,
) => requestContext.run(store, callback);

export const getRequestContext = () => requestContext.getStore();
