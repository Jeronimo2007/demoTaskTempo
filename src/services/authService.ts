import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL; // Obtener la URL del backend

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
  
    return response.data;
  };

export const getUserData = async (token: string) => {
  const response = await axios.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
