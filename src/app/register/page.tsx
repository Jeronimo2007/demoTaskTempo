'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { registerUser } from '@/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role_code, setRole_code] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    try {
      await registerUser(username, password, role_code);
      router.push('/login'); // Redirigir a login después del registro
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Error al registrar usuario: ${err.message}`);
      } else {
        setError('Error desconocido al registrar usuario');
      }
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
        <h2 className="text-xl font-bold mb-4 text-center">Registro</h2>
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
        <input
          type="text"
          placeholder="Código de rol"
          value={role_code}
          onChange={(e) => setRole_code(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <button
          onClick={handleRegister}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
        >
          Registrarse
        </button>
        <p className="text-sm text-center mt-2">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-blue-500 hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}