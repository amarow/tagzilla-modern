import type { StateCreator } from 'zustand';
import type { ApiKey, PrivacyProfile, PrivacyRule } from '../types';
import { API_BASE, authFetch } from '../utils';

export interface SettingsSlice {
  apiKeys: ApiKey[];
  privacyProfiles: PrivacyProfile[];
  
  fetchApiKeys: () => Promise<void>;
  createApiKey: (name: string, permissions?: string, privacyProfileId?: number) => Promise<ApiKey | null>;
  updateApiKey: (id: number, updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'privacyProfileId'>>) => Promise<void>;
  deleteApiKey: (id: number) => Promise<void>;

  fetchPrivacyProfiles: () => Promise<void>;
  createPrivacyProfile: (name: string) => Promise<PrivacyProfile | null>;
  updatePrivacyProfile: (id: number, name: string) => Promise<void>;
  deletePrivacyProfile: (id: number) => Promise<void>;
  fetchPrivacyRules: (profileId: number) => Promise<PrivacyRule[]>;
  addPrivacyRule: (profileId: number, rule: Omit<PrivacyRule, 'id' | 'profileId' | 'isActive'>) => Promise<void>;
  deletePrivacyRule: (id: number) => Promise<void>;
  togglePrivacyRule: (id: number, isActive: boolean) => Promise<void>;
  
  savePreferences: () => Promise<void>;
  init: () => Promise<void>;
}

export const createSettingsSlice: StateCreator<any, [], [], SettingsSlice> = (set, get) => ({
  apiKeys: [],
  privacyProfiles: [],

  fetchApiKeys: async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/keys`, get().token);
      if (res.ok) {
        const data = await res.json();
        set({ apiKeys: data });
      }
    } catch (e) {
      console.error("Failed to fetch api keys", e);
    }
  },

  createApiKey: async (name, permissions, privacyProfileId) => {
    set({ isLoading: true });
    try {
      const res = await authFetch(`${API_BASE}/api/keys`, get().token, {
        method: 'POST',
        body: JSON.stringify({ name, permissions, privacyProfileId })
      });
      if (res.ok) {
        const newKey = await res.json();
        await get().fetchApiKeys();
        set({ isLoading: false });
        return newKey;
      }
      set({ isLoading: false });
      return null;
    } catch (e) {
      set({ isLoading: false });
      console.error("Failed to create api key", e);
      return null;
    }
  },

  deleteApiKey: async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/api/keys/${id}`, get().token, { method: 'DELETE' });
      if (res.ok) await get().fetchApiKeys();
    } catch (e) {
      console.error("Failed to delete api key", e);
    }
  },

  updateApiKey: async (id, updates) => {
    try {
      const payload: any = { ...updates };
      if (updates.permissions) payload.permissions = (updates.permissions as any).join(',');
      const res = await authFetch(`${API_BASE}/api/keys/${id}`, get().token, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (res.ok) await get().fetchApiKeys();
    } catch (e) {
      console.error("Failed to update api key", e);
    }
  },

  fetchPrivacyProfiles: async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles`, get().token);
      if (res.ok) {
        const data = await res.json();
        set({ privacyProfiles: data });
      }
    } catch (e) {
      console.error("Failed to fetch privacy profiles", e);
    }
  },

  createPrivacyProfile: async (name) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles`, get().token, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newProfile = await res.json();
        await get().fetchPrivacyProfiles();
        return newProfile;
      }
    } catch (e) {
      console.error("Failed to create privacy profile", e);
    }
    return null;
  },

  updatePrivacyProfile: async (id, name) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles/${id}`, get().token, {
        method: 'PATCH',
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await get().fetchPrivacyProfiles();
        await get().fetchApiKeys(); 
      }
    } catch (e) {
      console.error("Failed to update privacy profile", e);
    }
  },

  deletePrivacyProfile: async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles/${id}`, get().token, { method: 'DELETE' });
      if (res.ok) {
        await get().fetchPrivacyProfiles();
        await get().fetchApiKeys();
      }
    } catch (e) {
      console.error("Failed to delete privacy profile", e);
    }
  },

  fetchPrivacyRules: async (profileId) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles/${profileId}/rules`, get().token);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to fetch privacy rules", e);
    }
    return [];
  },

  addPrivacyRule: async (profileId, rule) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/profiles/${profileId}/rules`, get().token, {
        method: 'POST',
        body: JSON.stringify(rule)
      });
      if (res.ok) await get().fetchPrivacyProfiles(); 
    } catch (e) {
      console.error("Failed to add privacy rule", e);
    }
  },

  deletePrivacyRule: async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/api/privacy/rules/${id}`, get().token, { method: 'DELETE' });
      if (res.ok) await get().fetchPrivacyProfiles(); 
    } catch (e) {
      console.error("Failed to delete privacy rule", e);
    }
  },

  togglePrivacyRule: async (id, isActive) => {
    try {
      await authFetch(`${API_BASE}/api/privacy/rules/${id}/toggle`, get().token, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
    } catch (e) {
      console.error("Failed to toggle privacy rule", e);
    }
  },

  savePreferences: async () => {
    const state = get();
    if (!state.token) return;
    const prefs = {
      activeScopeIds: state.activeScopeIds,
      selectedTagIds: state.selectedTagIds,
      searchCriteria: state.searchCriteria
    };
    try {
        await authFetch(`${API_BASE}/api/preferences`, state.token, {
            method: 'POST',
            body: JSON.stringify(prefs)
        });
    } catch (e) {
        console.error("Failed to save preferences", e);
    }
  },

  init: async () => {
    const { token } = get();
    if (!token) return;

    try {
        const res = await authFetch(`${API_BASE}/api/preferences`, token);
        const prefs = await res.json();
        if (prefs) {
            let criteria = { filename: '', content: '', directory: '' };
            if (prefs.searchQuery && typeof prefs.searchQuery === 'string') {
                criteria.filename = prefs.searchQuery;
            } else if (prefs.searchCriteria) {
                criteria = { ...criteria, ...prefs.searchCriteria };
            }

            set({ 
                activeScopeIds: prefs.activeScopeIds || [],
                selectedTagIds: prefs.selectedTagIds || (prefs.selectedTagId ? [prefs.selectedTagId] : []),
                searchCriteria: criteria
            });
        }
    } catch (e) {
        if ((e as Error).message === "Unauthorized") get().logout();
        return;
    }

    await Promise.all([
        get().fetchFiles(),
        get().fetchScopes(),
        get().fetchTags(),
        get().fetchApiKeys(),
        get().fetchPrivacyProfiles()
    ]);
  },
});
