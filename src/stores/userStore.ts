import { create } from "zustand";

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  role: "user" | "admin";
  subscriptionTier: "free" | "pro";
}

interface UserStore {
  user: User | null;
  tier: "free" | "pro" | "guest";
  isAdmin: boolean;
  setUser: (user: User | null) => void;
  setTier: (tier: UserStore["tier"]) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  tier: "guest",
  isAdmin: false,

  setUser: (user) =>
    set({
      user,
      tier: user ? (user.subscriptionTier as "free" | "pro") : "guest",
      isAdmin: user?.role === "admin",
    }),

  setTier: (tier) => set({ tier }),
}));
