import { create } from "zustand";

type User = {
  id: string | undefined;
  username: string
  role: string 
};

type AuthState = {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  getTokenFromCookie: () => string | null;
};

// Helper function to get token from cookie
const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null; // Check if running in browser
  
  const tokenCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('token='));
    
  return tokenCookie ? tokenCookie.split('=')[1] : null;
};

// Initialize token from cookie if available
const initialToken = getTokenFromCookie();

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: initialToken, // Initialize with token from cookie if available
  setUser: (user, token) => {
    // Set cookie with token
    document.cookie = `token=${token}; path=/; Secure; SameSite=Strict`;
    set({ user, token });
  },
  logout: () => {
    // Clear token cookie
    document.cookie = "token=; Max-Age=0; path=/";
    set({ user: null, token: null });
  },
  getTokenFromCookie, // Expose helper function
}));
