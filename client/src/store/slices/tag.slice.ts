import type { StateCreator } from 'zustand';
import type { Tag } from '../types';
import { API_BASE, authFetch } from '../utils';

export interface TagSlice {
  tags: Tag[];
  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<void>;
  updateTag: (id: number, updates: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
}

export const createTagSlice: StateCreator<any, [], [], TagSlice> = (set, get) => ({
  tags: [],

  fetchTags: async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/tags`, get().token);
      const data = await response.json();
      set({ tags: data });
    } catch (error) {}
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
    const { tags, files } = get();
    
    // Optimistic Update
    const newTags = tags.map((t: Tag) => t.id === id ? { ...t, ...updates } : t);
    set({ tags: newTags });

    const newFiles = files.map((f: any) => ({
        ...f,
        tags: f.tags.map((t: Tag) => t.id === id ? { ...t, ...updates } : t)
    }));
    set({ files: newFiles });

    try {
      const response = await authFetch(`${API_BASE}/api/tags/${id}`, get().token, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
         await get().fetchTags();
         await get().fetchFiles(); 
      }
    } catch (error) {
      console.error('Failed to update tag', error);
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
        const { selectedTagIds } = get();
        if (selectedTagIds.includes(id)) {
            set({ selectedTagIds: selectedTagIds.filter((tid: number) => tid !== id) });
        }
        await get().fetchTags();
        await get().fetchFiles();
      }
    } catch (error) {
      console.error('Failed to delete tag', error);
    }
  },
});
