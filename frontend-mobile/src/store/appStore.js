/**
 * App-level store - UI preferences, network state, etc.
 */
import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Network
  isOnline: true,
  setOnline: (val) => set({ isOnline: val }),

  // Theme (for future dark mode)
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  // Toast messages
  toast: null,
  showToast: (message, type = 'info', duration = 3000) => {
    set({ toast: { message, type, duration, id: Date.now() } });
    setTimeout(() => set({ toast: null }), duration);
  },
  hideToast: () => set({ toast: null }),
}));
