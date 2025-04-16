import { create } from "zustand";

export type User = {
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

// Initial state read from localStorage, checking if window is defined for SSR compatibility
const initialUserString = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const initialUser = initialUserString ? JSON.parse(initialUserString) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  setUser: (user, token) => {
    console.log('Setting user in auth store:', { user, token: token ? 'present' : 'missing' });
    
    // Clear existing data first
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Store new user and token in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    
    // Update store state
    set({ user, token });
  },
  logout: () => {
    console.log('Logging out - Clearing auth store');
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear store state
    set({ user: null, token: null });
  },
}));
