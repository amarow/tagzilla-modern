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
  activeScopeIds: number[];
  selectedTagId: number | null;
  searchQuery: string;
  
  // UI State
  language: 'en' | 'de';

  // Selection State (for Checkboxes)
  selectedFileIds: number[];

  // Auth Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  toggleLanguage: () => void;

  // Data Actions
  init: () => Promise<void>;
  fetchFiles: () => Promise<void>;
  fetchScopes: () => Promise<void>;
  fetchTags: () => Promise<void>;
  
  addScope: (path: string) => Promise<void>;
  deleteScope: (id: number) => Promise<void>;
  refreshScope: (id: number) => Promise<void>;
  
  addTagToFile: (fileId: number, tagName: string) => Promise<void>;
  addTagToMultipleFiles: (fileIds: number[], tagName: string) => Promise<void>;
  removeTagFromFile: (fileId: number, tagId: number) => Promise<void>;
  
  createTag: (name: string, color?: string) => Promise<void>;
  updateTag: (id: number, updates: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  openFile: (fileId: number) => Promise<void>;
  
  // Filter Actions
  toggleScopeActive: (id: number) => void;
  setTagFilter: (id: number | null) => void;
  setSearchQuery: (query: string) => void;

  // Selection Actions
  toggleFileSelection: (fileId: number) => void;
  setFileSelection: (fileIds: number[]) => void;
  clearFileSelection: () => void;
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
    activeScopeIds: state.activeScopeIds,
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
      
      activeScopeIds: [],
      selectedTagId: null,
      searchQuery: '',
      
      language: 'en',

      selectedFileIds: [],

      toggleLanguage: () => {
          set((state) => ({ language: state.language === 'en' ? 'de' : 'en' }));
      },

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
              set({ isLoading: false, error: null });
              alert("Registration successful! Please login.");
          } catch (e: any) {
              set({ error: e.message, isLoading: false });
          }
      },

      logout: () => {
          set({ token: null, user: null, isAuthenticated: false, files: [], scopes: [], tags: [], selectedFileIds: [] });
      },

      init: async () => {
          const { token } = get();
          if (!token) return;

          try {
              const res = await authFetch(`${API_BASE}/api/preferences`, token);
              const prefs = await res.json();
              if (prefs) {
                  set({ 
                      activeScopeIds: prefs.activeScopeIds || [],
                      selectedTagId: prefs.selectedTagId || null,
                      searchQuery: prefs.searchQuery || ''
                  });
              }
          } catch (e) {
              if ((e as Error).message === "Unauthorized") get().logout();
              return;
          }

          await Promise.all([
              get().fetchFiles(),
              get().fetchScopes(),
              get().fetchTags()
          ]);
      },

      toggleScopeActive: (id) => {
          const { activeScopeIds } = get();
          if (activeScopeIds.includes(id)) {
              set({ activeScopeIds: activeScopeIds.filter(sid => sid !== id) });
          } else {
              set({ activeScopeIds: [...activeScopeIds, id] });
          }
          savePreferences(get());
      },
      
      setTagFilter: (id) => {
          set({ selectedTagId: id });
          savePreferences(get());
      },

      setSearchQuery: (query) => {
          set({ searchQuery: query });
          savePreferences(get());
      },

      toggleFileSelection: (fileId) => {
          const { selectedFileIds } = get();
          if (selectedFileIds.includes(fileId)) {
              set({ selectedFileIds: selectedFileIds.filter(id => id !== fileId) });
          } else {
              set({ selectedFileIds: [...selectedFileIds, fileId] });
          }
      },

      setFileSelection: (fileIds) => {
          set({ selectedFileIds: fileIds });
      },

      clearFileSelection: () => {
          set({ selectedFileIds: [] });
      },

      fetchFiles: async () => {
        set({ isLoading: true });
        try {
          const response = await authFetch(`${API_BASE}/api/files`, get().token);
          const data = await response.json();
          set({ files: data, isLoading: false });
        } catch (error) {
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
          const { activeScopeIds } = get();
          if (activeScopeIds.includes(id)) {
             set({ activeScopeIds: activeScopeIds.filter(sid => sid !== id) });
             savePreferences(get());
          }
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

      updateTag: async (id: number, updates: { name?: string; color?: string }) => {
        // Optimistic Update
        const { tags, files } = get();
        
        // 1. Update Tag List locally
        const newTags = tags.map(t => t.id === id ? { ...t, ...updates } : t);
        set({ tags: newTags });

        // 2. Update Files locally (propagate tag change to all files having this tag)
        // This makes the color change visible instantly on the file list
        const newFiles = files.map(f => ({
            ...f,
            tags: f.tags.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
        set({ files: newFiles });

        try {
          const response = await authFetch(`${API_BASE}/api/tags/${id}`, get().token, {
            method: 'PATCH',
            body: JSON.stringify(updates),
          });
          
          // Re-fetch only on error or to ensure consistency, but don't block
          if (!response.ok) {
             await get().fetchTags();
             await get().fetchFiles(); 
          }
        } catch (error) {
          console.error('Failed to update tag', error);
          // Rollback/Sync on error
          await get().fetchTags();
          await get().fetchFiles(); 
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

      addTagToMultipleFiles: async (fileIds: number[], tagName: string) => {
          const { token, files } = get();
          console.log(`[Store] Adding tag "${tagName}" to ${fileIds.length} files...`);
          try {
              const res = await authFetch(`${API_BASE}/api/files/bulk-tags`, token, {
                  method: 'POST',
                  body: JSON.stringify({ fileIds, tagName })
              });
              
              if (res.ok) {
                  const { tag, updatedFileIds } = await res.json();
                  console.log(`[Store] Server updated ${updatedFileIds.length} files. Applying optimistic update...`);
                  
                  // Optimistic Update - Use Set for O(1) lookup to avoid O(N*M) complexity
                  const updatedIdSet = new Set(updatedFileIds);
                  const newFiles = files.map(f => {
                      if (updatedIdSet.has(f.id)) {
                          // Add tag if not exists
                          if (!f.tags.some(t => t.id === tag.id)) {
                              return { ...f, tags: [...f.tags, tag] };
                          }
                      }
                      return f;
                  });
                  
                  set({ files: newFiles });
                  console.log(`[Store] Optimistic update complete.`);
                  await get().fetchTags(); // Update counts
              }
          } catch (e) {
              console.error("Failed to add tags to multiple files", e);
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
      name: 'tagzilla-auth-storage', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        language: state.language
      }),
    }
  )
);