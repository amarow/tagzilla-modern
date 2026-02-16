import type { StateCreator } from 'zustand';
import type { Scope } from '../types';
import { API_BASE, authFetch } from '../utils';

export interface ScopeSlice {
  scopes: Scope[];
  activeScopeIds: number[];
  fetchScopes: () => Promise<void>;
  addScope: (path: string) => Promise<void>;
  deleteScope: (id: number) => Promise<void>;
  updateScope: (id: number, updates: Partial<Pick<Scope, 'name' | 'path'>>) => Promise<void>;
  refreshScope: (id: number) => Promise<void>;
  refreshAllScopes: () => Promise<void>;
  toggleScopeActive: (id: number) => void;
}

export const createScopeSlice: StateCreator<any, [], [], ScopeSlice> = (set, get) => ({
  scopes: [],
  activeScopeIds: [],

  fetchScopes: async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/scopes`, get().token);
      const data = await response.json();
      set({ scopes: data });
    } catch (error) {}
  },

  addScope: async (path: string) => {
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_BASE}/api/scopes`, get().token, {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to add scope');
      }
      await get().fetchScopes();
      await get().fetchFiles();
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteScope: async (id: number) => {
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_BASE}/api/scopes/${id}`, get().token, {
        method: 'DELETE'
      });
      if (!response.ok) {
          throw new Error('Failed to delete scope');
      }
      const { activeScopeIds } = get();
      if (activeScopeIds.includes(id)) {
         set({ activeScopeIds: activeScopeIds.filter((sid: number) => sid !== id) });
         get().savePreferences();
      }
      await get().fetchScopes();
      await get().fetchFiles();
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateScope: async (id, updates) => {
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_BASE}/api/scopes/${id}`, get().token, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
          throw new Error('Failed to update scope');
      }
      await get().fetchScopes();
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  refreshScope: async (id: number) => {
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_BASE}/api/scopes/${id}/refresh`, get().token, {
        method: 'POST'
      });
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to refresh scope');
      }
      await get().fetchFiles();
      await get().fetchTags(); 
      set({ isLoading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  refreshAllScopes: async () => {
      const { activeScopeIds, refreshScope, fetchTags } = get();
      for (const id of activeScopeIds) {
          await refreshScope(id);
      }
      await fetchTags();
  },

  toggleScopeActive: (id) => {
      const { activeScopeIds } = get();
      if (activeScopeIds.includes(id)) {
          set({ activeScopeIds: activeScopeIds.filter((sid: number) => sid !== id) });
      } else {
          set({ activeScopeIds: [...activeScopeIds, id] });
      }
      get().savePreferences();
  },
});
