import type { StateCreator } from 'zustand';

export interface AppSlice {
  activeMainTab: 'filter' | 'data';
  setActiveMainTab: (tab: 'filter' | 'data') => void;
}

export const createAppSlice: StateCreator<any, [], [], AppSlice> = (set) => ({
  activeMainTab: 'filter',
  setActiveMainTab: (tab) => set({ activeMainTab: tab }),
});
