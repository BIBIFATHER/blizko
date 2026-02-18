import { describe, expect, it, beforeEach } from 'vitest';
import { setStorageAdapter } from '../core/platform/storage';
import { getParentRequests, saveParentRequest, updateParentRequest } from './storage';

const createMemoryAdapter = () => {
  const store = new Map<string, string>();
  return {
    adapter: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    store,
  };
};

describe('storage', () => {
  beforeEach(() => {
    const { adapter } = createMemoryAdapter();
    setStorageAdapter(adapter);
  });

  it('returns empty list when local storage is corrupted', async () => {
    const { adapter } = createMemoryAdapter();
    setStorageAdapter({
      ...adapter,
      getItem: () => 'not-json',
    });

    const parents = await getParentRequests();
    expect(parents).toEqual([]);
  });

  it('blocks editing approved requests by default', async () => {
    const created = await saveParentRequest({
      city: 'Moscow',
      childAge: '3',
      schedule: 'Weekdays',
      budget: '1000',
      requirements: [],
      comment: 'Test',
    });

    await updateParentRequest(
      { id: created.id, status: 'approved' },
      { actor: 'admin', forceStatusEvent: true }
    );

    const updated = await updateParentRequest({ id: created.id, comment: 'New' });
    expect(updated).toBeNull();
  });
});
