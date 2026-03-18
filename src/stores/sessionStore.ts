import { create } from 'zustand';

interface SessionStore {
  /** Internal DB UUID for the active org — populated by SessionSync after auth/sync. */
  internalOrgId: string | null;
  /** Internal DB UUID for the current user. */
  internalUserId: string | null;
  setSession: (orgId: string, userId: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  internalOrgId: null,
  internalUserId: null,
  setSession: (orgId, userId) => set({ internalOrgId: orgId, internalUserId: userId }),
  clearSession: () => set({ internalOrgId: null, internalUserId: null }),
}));
