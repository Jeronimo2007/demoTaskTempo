'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const { setUser, user } = useAuthStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      router.push("/lawspace");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      const data = await loginUser(username, password);
      setUser({ id: data.user_id, username: data.username, role: data.role}, data.access_token);
      router.push("/lawspace");
    } catch (err) {
      console.error("Login error:", err);
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
      <div className="flex justify-center mb-4 mt-2">
        <img 
          src="/img/logo.jpeg" 
          alt="SSL" 
          className="h-60 object-contain" // Increased height from h-12 to h-16
        />
      </div>
        <h2 className="text-xl font-bold mb-4 text-center">Iniciar Sesión</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 rounded"
        >
          Ingresar
        </button>
        <p className="text-sm text-center mt-2">
          ¿No tienes cuenta? <a href="/register" className="text-blue-500">Regístrate</a>
        </p>
      </div>
    </div>
  );
}
