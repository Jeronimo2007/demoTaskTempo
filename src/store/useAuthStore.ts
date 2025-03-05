import { create } from "zustand";

type User = {
  id: string;
  username: string;
  role: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user, token) => {
    
    document.cookie = `token=${token}; path=/; Secure; SameSite=Strict`;

    set({ user, token });
  },
  logout: () => {
    
    document.cookie = "token=; Max-Age=0; path=/";
    
    set({ user: null, token: null });
  },
}));
