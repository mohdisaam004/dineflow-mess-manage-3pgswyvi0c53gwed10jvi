import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Member } from '@shared/types';
import { setAuthToken } from '@/lib/auth-token';

export type AuthRole = 'admin' | 'member' | 'super_admin' | null;

type AuthState = {
  role: AuthRole;
  member: Member | null;
  token: string | null;
  login: (role: Exclude<AuthRole, null>, member?: Member, token?: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      member: null,
      token: null,
      login: (role, member, token) => {
        if (token) setAuthToken(token);
        set({ role, member: member || null, token: token || null });
      },
      logout: () => {
        setAuthToken(null);
        set({ role: null, member: null, token: null });
      },
    }),
    {
      name: 'al-iqsha-mess-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);

/** True when logged in as admin or super admin. */
export function isAdminRole(role: AuthRole): boolean {
  return role === 'admin' || role === 'super_admin';
}
