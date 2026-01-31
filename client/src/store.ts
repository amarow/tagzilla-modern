import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FileHandle {
  id: number;
  path: string;
  name: string;
  extension: string;
  size: number;
  mimeType: string | null;
  updatedAt: string;
  tags: Tag[];
}

interface Tag {
  id: number;
  name: string;
  color: string | null;
  _count?: {
    files: number;
  };
}

interface Scope {
  id: number;
  path: string;
  name: string;
}

interface User {
  id: number;
  username: string;
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Data
  files: FileHandle[];
  scopes: Scope[];
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  
  // Filter State
  selectedScopeId: number | null;
  selectedTagId: number | null;
  searchQuery: string;
  
  // Auth Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // Data Actions
  init: () => Promise<void>;
  fetchFiles: () => Promise<void>;
  fetchScopes: () => Promise<void>;
  fetchTags: () => Promise<void>;
  
  addScope: (path: string) => Promise<void>;
  deleteScope: (id: number) => Promise<void>;
  refreshScope: (id: number) => Promise<void>;
  addTagToFile: (fileId: number, tagName: string) => Promise<void>;
  removeTagFromFile: (fileId: number, tagId: number) => Promise<void>;
  createTag: (name: string, color?: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  openFile: (fileId: number) => Promise<void>;
  
  // Filter Actions
  setScopeFilter: (id: number | null) => void;
  setTagFilter: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
}

const API_BASE = 'http://localhost:3001';

// Helper for authorized fetch
const authFetch = async (url: string, token: string | null, options: RequestInit = {}) => {
  if (!token) throw new Error("No token");
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
  }
  return response;
};

// Helper to save prefs
const savePreferences = async (state: AppState) => {
  if (!state.token) return;
  const prefs = {
    selectedScopeId: state.selectedScopeId,
    selectedTagId: state.selectedTagId,
    searchQuery: state.searchQuery
  };
  try {
      await authFetch(`${API_BASE}/api/preferences`, state.token, {
          method: 'POST',
          body: JSON.stringify(prefs)
      });
  } catch (e) {
      console.error("Failed to save preferences", e);
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      files: [],
      scopes: [],
      tags: [],
      isLoading: false,
      error: null,
      
      selectedScopeId: null,
      selectedTagId: null,
      searchQuery: '',
      activeStampTagId: null,

      login: async (username, password) => {
          set({ isLoading: true, error: null });
          try {
              const res = await fetch(`${API_BASE}/api/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Login failed');
              
              set({ token: data.token, user: data.user, isAuthenticated: true, isLoading: false });
              await get().init();
          } catch (e: any) {
              set({ error: e.message, isLoading: false });
          }
      },

      register: async (username, password) => {
          set({ isLoading: true, error: null });
          try {
              const res = await fetch(`${API_BASE}/api/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Registration failed');
              
              // Auto login after register? Or just success message?
              // Let's just stop loading and let user login
              set({ isLoading: false, error: null });
              alert("Registration successful! Please login.");
          } catch (e: any) {
              set({ error: e.message, isLoading: false });
          }
      },

      logout: () => {
          set({ token: null, user: null, isAuthenticated: false, files: [], scopes: [], tags: [] });
      },

      init: async () => {
          const { token } = get();
          if (!token) return;

          try {
              const res = await authFetch(`${API_BASE}/api/preferences`, token);
              const prefs = await res.json();
              if (prefs) {
                  set({ 
                      selectedScopeId: prefs.selectedScopeId || null,
                      selectedTagId: prefs.selectedTagId || null,
                      searchQuery: prefs.searchQuery || ''
                  });
              }
          } catch (e) {
              // If init fails (e.g. invalid token), logout
              if ((e as Error).message === "Unauthorized") get().logout();
              return;
          }

          await Promise.all([
              get().fetchFiles(),
              get().fetchScopes(),
              get().fetchTags()
          ]);
      },

      setScopeFilter: (id) => {
          set({ selectedScopeId: id, selectedTagId: null });
          savePreferences(get());
      },
      
      setTagFilter: (id) => {
          set({ selectedTagId: id, selectedScopeId: null });
          savePreferences(get());
      },

      setSearchQuery: (query) => {
          set({ searchQuery: query });
          savePreferences(get());
      },

      setStampMode: (tagId) => {
          set({ activeStampTagId: tagId });
      },

      fetchFiles: async () => {
        set({ isLoading: true });
        try {
          const response = await authFetch(`${API_BASE}/api/files`, get().token);
          const data = await response.json();
          set({ files: data, isLoading: false });
        } catch (error) {
           // handled in authFetch mostly
           set({ isLoading: false });
        }
      },

      fetchScopes: async () => {
        try {
          const response = await authFetch(`${API_BASE}/api/scopes`, get().token);
          const data = await response.json();
          set({ scopes: data });
        } catch (error) {}
      },

      fetchTags: async () => {
        try {
          const response = await authFetch(`${API_BASE}/api/tags`, get().token);
          const data = await response.json();
          set({ tags: data });
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
          if (get().selectedScopeId === id) get().setScopeFilter(null);
          await get().fetchScopes();
          await get().fetchFiles();
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
          set({ isLoading: false, error: null });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      createTag: async (name: string, color?: string) => {
        try {
          const response = await authFetch(`${API_BASE}/api/tags`, get().token, {
            method: 'POST',
            body: JSON.stringify({ name, color }),
          });
          if (response.ok) {
            await get().fetchTags();
          }
        } catch (error) {
          console.error('Failed to create tag', error);
        }
      },

      deleteTag: async (id: number) => {
        try {
          const response = await authFetch(`${API_BASE}/api/tags/${id}`, get().token, {
            method: 'DELETE',
          });
          if (response.ok) {
            if (get().selectedTagId === id) get().setTagFilter(null);
            await get().fetchTags();
            await get().fetchFiles();
          }
        } catch (error) {
          console.error('Failed to delete tag', error);
        }
      },

      addTagToFile: async (fileId: number, tagName: string) => {
        try {
          const response = await authFetch(`${API_BASE}/api/files/${fileId}/tags`, get().token, {
            method: 'POST',
            body: JSON.stringify({ tagName }),
          });
          if (response.ok) {
            await get().fetchFiles();
            await get().fetchTags();
          }
        } catch (error) {
          console.error('Failed to add tag', error);
        }
      },

      removeTagFromFile: async (fileId: number, tagId: number) => {
        try {
          const response = await authFetch(`${API_BASE}/api/files/${fileId}/tags/${tagId}`, get().token, {
            method: 'DELETE',
          });
          if (response.ok) {
            await get().fetchFiles();
            await get().fetchTags();
          }
        } catch (error) {
          console.error('Failed to remove tag', error);
        }
      },

      openFile: async (fileId: number) => {
        try {
          await authFetch(`${API_BASE}/api/files/${fileId}/open`, get().token, { method: 'POST' });
        } catch (error) {
          console.error('Failed to open file', error);
        }
      },
    }),
    {
      name: 'tagzilla-auth-storage', // Changed name to reset old invalid state
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        token: state.token,
        user: state.user
      }), // Persist only auth data. Prefs are loaded from DB on init.
    }
  )
);