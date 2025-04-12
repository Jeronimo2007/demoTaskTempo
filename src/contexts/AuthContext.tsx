'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/store/useAuthStore'; // Import the Zustand store

// Define types for user and context (Keep the User type consistent or import if defined elsewhere)
// Ensure this User type matches the one expected by components consuming the context
// and the one stored in useAuthStore.
type User = {
  id: string | undefined; // Match the store's User type
  username: string;      // Match the store's User type
  role: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // Add loading state
  login: (userData: User, token: string) => void; // Match store's setUser signature
  logout: () => void;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get state and actions from Zustand store
  const { user, token, setUser, logout: storeLogout } = useAuthStore();
  const [loading, setLoading] = useState(true); // Initialize loading state

  // Determine authentication status based on the token from the store
  const isAuthenticated = !!token;

  // Simulate loading completion after initial mount
  // This allows Zustand to potentially hydrate from localStorage before we check auth
  useEffect(() => {
    // Check if Zustand has hydrated (simple check based on token presence)
    // A more robust solution might involve Zustand persistence middleware state
    setLoading(false);
  }, []); // Runs once after mount

  // Context's login function now calls the store's setUser
  const login = (userData: User, token: string) => {
    setUser(userData, token);
  };

  // Context's logout function now calls the store's logout
  const logout = () => {
    storeLogout();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {/* Render children only when not loading */}
      {!loading ? children : null /* Or render a global loading spinner */}
    </AuthContext.Provider>
  );
};

// Custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
