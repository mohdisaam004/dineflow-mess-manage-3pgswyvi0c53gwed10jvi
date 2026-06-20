import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Member } from '@shared/types';
type AuthState = {
  role: 'admin' | 'member' | null;
  member: Member | null;
  login: (role: 'admin' | 'member', member?: Member) => void;
  logout: () => void;
};
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      member: null,
      login: (role, member) => set({ role, member: member || null }),
      logout: () => set({ role: null, member: null }),
    }),
    {
      name: 'baraha-mess-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);