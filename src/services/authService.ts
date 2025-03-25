import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL; // Obtener la URL del backend

// Clave para almacenar el token en localStorage
export const TOKEN_KEY = 'ssl_auth_token';

/**
 * Guarda el token de autorización en localStorage
 * @param token - Token de autorización para guardar
 */
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Obtiene el token de autorización desde localStorage
 * @returns Token de autorización o null si no existe
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Elimina el token de autorización de localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Verifica si existe un token de autorización válido
 * @returns true si existe un token, false en caso contrario
 */
export const hasValidToken = (): boolean => {
  const token = getToken();
  return !!token;
};

export const registerUser = async (username: string, password: string, role_code: string) => {
  const response = await axios.post(`${API_URL}/users/register`, { username, password, role_code });
  return response.data;
};

export const loginUser = async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
  
    const response = await axios.post(`${API_URL}/users/login`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Guardar el token automáticamente al iniciar sesión
    if (response.data && response.data.access_token) {
      saveToken(response.data.access_token);
    }
  
    return response.data;
  };

export const getUserData = async (token?: string) => {
  // Si no se proporciona un token, intentar obtenerlo del almacenamiento local
  const authToken = token || getToken();
  
  if (!authToken) {
    throw new Error('No authentication token available');
  }
  
  const response = await axios.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
};

/**
 * Cierra la sesión del usuario eliminando el token
 */
export const logout = (): void => {
  removeToken();
};
