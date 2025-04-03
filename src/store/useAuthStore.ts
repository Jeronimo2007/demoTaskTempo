import { create } from "zustand";

type User = {
  id: string | undefined;
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
    // Clear existing data first
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Store new user and token in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    
    // Set cookie with new token
    document.cookie = `token=${token}; path=/`;
    
    // Update store state
    set({ user, token });
  },
  logout: () => {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear cookie
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Clear store state
    set({ user: null, token: null });
  },
}));
