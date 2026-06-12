import { AsyncLocalStorage } from 'async_hooks';
import type { User } from '../repositories/userRepository';

/**
 * Per-request auth context propagated with AsyncLocalStorage.
 *
 * Request handlers (GraphQL / REST) wrap their work in `runWithAuthContext`
 * so services and repositories can read the current user and the selected
 * project without changing every call signature. Code running outside a
 * request (background trackers, migrations) simply sees an empty store and
 * keeps the original single-project behavior.
 */
export interface AuthContextStore {
  user?: User;
  selectedProjectId?: number;
}

const storage = new AsyncLocalStorage<AuthContextStore>();

export const runWithAuthContext = <T>(
  store: AuthContextStore,
  fn: () => T,
): T => {
  return storage.run(store, fn);
};

export const getAuthContext = (): AuthContextStore | undefined => {
  return storage.getStore();
};

export const getAuthUser = (): User | undefined => {
  return storage.getStore()?.user;
};

export const getSelectedProjectId = (): number | undefined => {
  return storage.getStore()?.selectedProjectId;
};
