import { useAuthStore } from '@/store/useAuthStore';
import { message } from 'antd';

// Define the AuthHeaders type
export interface AuthHeaders {
  headers: {
    Authorization: string;
  };
}

/**
 * Returns authentication headers for API requests
 * @returns Authentication headers object or empty object if no token
 */
export const getAuthHeaders = (): AuthHeaders | Record<string, never> => {
  const auth = useAuthStore.getState();
  
  if (!auth.token) {
    message.warning('No hay token de autenticación disponible');
    return {};
  }
  
  return {
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  };
};
