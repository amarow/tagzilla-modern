import type { StateCreator } from 'zustand';
import type { FileHandle } from '../types';
import { API_BASE, authFetch } from '../utils';

export interface FileSlice {
  files: FileHandle[];
  selectedFileIds: number[];
  previewFileId: number | null;
  
  fetchFiles: () => Promise<void>;
  addTagToFile: (fileId: number, tagName: string) => Promise<void>;
  addTagToMultipleFiles: (fileIds: number[], tagName: string) => Promise<void>;
  removeTagFromFile: (fileId: number, tagId: number) => Promise<void>;
  removeTagFromMultipleFiles: (fileIds: number[], tagId: number) => Promise<void>;
  openFile: (fileId: number) => Promise<void>;
  setPreviewFileId: (id: number | null) => void;
  toggleFileSelection: (fileId: number) => void;
  setFileSelection: (fileIds: number[]) => void;
  clearFileSelection: () => void;
}

export const createFileSlice: StateCreator<any, [], [], FileSlice> = (set, get) => ({
  files: [],
  selectedFileIds: [],
  previewFileId: null,

  setPreviewFileId: (id) => set({ previewFileId: id }),

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
      try {
          const res = await authFetch(`${API_BASE}/api/files/bulk-tags`, token, {
              method: 'POST',
              body: JSON.stringify({ fileIds, tagName })
          });
          
          if (res.ok) {
              const { tag, updatedFileIds } = await res.json();
              const updatedIdSet = new Set(updatedFileIds);
              const newFiles = files.map((f: FileHandle) => {
                  if (updatedIdSet.has(f.id)) {
                      if (!f.tags.some(t => t.id === tag.id)) {
                          return { ...f, tags: [...f.tags, tag] };
                      }
                  }
                  return f;
              });
              
              set({ files: newFiles });
              await get().fetchTags();
          }
      } catch (e) {
          console.error("Failed to add tags to multiple files", e);
      }
  },

  removeTagFromMultipleFiles: async (fileIds: number[], tagId: number) => {
      const { token, files, tags } = get();
      const fileIdSet = new Set(fileIds);
      let removedCount = 0;

      const newFiles = files.map((f: FileHandle) => {
          if (fileIdSet.has(f.id)) {
              if (f.tags.some(t => t.id === tagId)) {
                  removedCount++;
                  return { ...f, tags: f.tags.filter(t => t.id !== tagId) };
              }
          }
          return f;
      });

      const newTags = tags.map((t: any) => {
          if (t.id === tagId) {
              const current = t._count?.files || 0;
              return { ...t, _count: { files: Math.max(0, current - removedCount) } };
          }
          return t;
      });

      set({ files: newFiles, tags: newTags });

      try {
          const res = await authFetch(`${API_BASE}/api/files/bulk-tags`, token, {
              method: 'DELETE',
              body: JSON.stringify({ fileIds, tagId })
          });
          
          if (!res.ok) throw new Error('Bulk remove failed');
          await get().fetchTags(); 
      } catch (e) {
          console.error('Failed to remove tags from multiple files', e);
          await get().fetchFiles();
          await get().fetchTags();
      }
  },

  removeTagFromFile: async (fileId: number, tagId: number) => {
    const { selectedFileIds } = get();
    if (selectedFileIds.includes(fileId) && selectedFileIds.length > 0) {
        await get().removeTagFromMultipleFiles(selectedFileIds, tagId);
        return;
    }

    try {
      const { files, tags } = get();
      const newFiles = files.map((f: FileHandle) => {
          if (f.id === fileId) {
              return { ...f, tags: f.tags.filter(t => t.id !== tagId) };
          }
          return f;
      });

      const newTags = tags.map((t: any) => {
          if (t.id === tagId) {
              const current = t._count?.files || 0;
              return { ...t, _count: { files: Math.max(0, current - 1) } };
          }
          return t;
      });

      set({ files: newFiles, tags: newTags });

      const response = await authFetch(`${API_BASE}/api/files/${fileId}/tags/${tagId}`, get().token, {
        method: 'DELETE',
      });
      if (response.ok) {
        await get().fetchTags();
      } else {
         await get().fetchFiles(); 
         await get().fetchTags();
      }
    } catch (error) {
      console.error('Failed to remove tag', error);
      await get().fetchFiles();
      await get().fetchTags();
    }
  },

  openFile: async (fileId: number) => {
    try {
      await authFetch(`${API_BASE}/api/files/${fileId}/open`, get().token, { method: 'POST' });
    } catch (error) {
      console.error('Failed to open file', error);
    }
  },

  toggleFileSelection: (fileId) => {
      const { selectedFileIds } = get();
      if (selectedFileIds.includes(fileId)) {
          set({ selectedFileIds: selectedFileIds.filter((id: number) => id !== fileId) });
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
});
