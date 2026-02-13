import type { StateCreator } from 'zustand';
import type { FileHandle, SearchCriteria } from '../types';
import { API_BASE, authFetch } from '../utils';

export interface SearchSlice {
  searchCriteria: SearchCriteria;
  selectedTagIds: number[];
  searchResults: FileHandle[];
  isSearching: boolean;
  
  toggleTagFilter: (id: number) => void;
  selectSingleTag: (id: number) => void;
  clearTagFilters: () => void;
  setSearchCriteria: (criteria: Partial<SearchCriteria>) => void;
  performSearch: () => Promise<void>;
  clearSearch: () => void;
}

let searchTimeout: any = null;

export const createSearchSlice: StateCreator<any, [], [], SearchSlice> = (set, get) => ({
  searchCriteria: { filename: '', content: '', directory: '' },
  selectedTagIds: [],
  searchResults: [],
  isSearching: false,

  toggleTagFilter: (id) => {
      const { selectedTagIds } = get();
      if (selectedTagIds.includes(id)) {
          set({ selectedTagIds: selectedTagIds.filter((tid: number) => tid !== id) });
      } else {
          set({ selectedTagIds: [...selectedTagIds, id] });
      }
      get().savePreferences();
  },

  selectSingleTag: (id) => {
      set({ selectedTagIds: [id] });
      get().savePreferences();
  },

  clearTagFilters: () => {
      set({ selectedTagIds: [] });
      get().savePreferences();
  },

  setSearchCriteria: (updates) => {
      const newCriteria = { ...get().searchCriteria, ...updates };
      set({ searchCriteria: newCriteria });
      get().savePreferences();

      if (searchTimeout) clearTimeout(searchTimeout);

      const hasInput = (newCriteria.filename.length >= 3) || 
                       (newCriteria.content.length >= 3) || 
                       (newCriteria.directory.length >= 3);
      
      const isEmpty = !newCriteria.filename && !newCriteria.content && !newCriteria.directory;

      if (hasInput || isEmpty) {
          searchTimeout = setTimeout(() => {
              get().performSearch();
          }, 500);
      }
  },
  
  clearSearch: () => {
      set({ 
          searchCriteria: { filename: '', content: '', directory: '' }, 
          searchResults: [],
          isSearching: false 
      });
      get().savePreferences();
  },

  performSearch: async () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      
      const { token, searchCriteria } = get();
      const { filename, content, directory } = searchCriteria;

      if (!filename.trim() && !content.trim() && !directory.trim()) {
          set({ searchResults: [], isSearching: false });
          return;
      }
      
      set({ isSearching: true, error: null });
      try {
          const params = new URLSearchParams();
          if (filename) params.append('filename', filename);
          if (content) params.append('content', content);
          if (directory) params.append('directory', directory);

          const res = await authFetch(`${API_BASE}/api/search?${params.toString()}`, token);
          if (res.ok) {
              const data = await res.json();
              set({ searchResults: data, isSearching: false });
          } else {
              throw new Error("Search failed");
          }
      } catch (e: any) {
          set({ isSearching: false, error: e.message });
      }
  },
});
