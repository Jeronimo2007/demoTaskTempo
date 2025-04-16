'use client'
import Image from 'next/image';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";


export default function LoginPage() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const [email, setEmail] = useState(""); // Renamed from username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userData = urlParams.get('user');
    const error = urlParams.get('error');

    console.log('Google Auth Callback - Full URL:', window.location.href);
    console.log('Google Auth Callback - URL Params:', {
      token: token ? 'present' : 'missing',
      userData: userData ? 'present' : 'missing',
      error: error || 'none'
    });

    if (error) {
      console.error('Google Auth Error:', error);
      setError(`Error de autenticación: ${error}`);
      return;
    }

    if (token && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        console.log('Google Auth - Parsed User Data:', user);
        setUser(user, token);
        router.push("/lawspace");
      } catch (err) {
        console.error("Error processing Google auth callback:", err);
        setError("Error al procesar la autenticación de Google");
      }
    }
  }, [setUser, router]);

  const handleLogin = async () => {
    try {
      const data = await loginUser(email, password); // Use email state
      setUser({ id: data.user_id, username: data.username, role: data.role}, data.access_token);
      router.push("/lawspace");
    } catch (err) {
      console.error("Login error:", err);
      setError("Usuario o contraseña incorrectos");
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to the backend endpoint for Google OAuth using the API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const frontendUrl = window.location.origin;
    const callbackUrl = `${frontendUrl}/login`;
    
    console.log('Initiating Google Login:', {
      apiUrl,
      frontendUrl,
      callbackUrl
    });
    
    window.location.href = `${apiUrl}/auth/google?callback_url=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
      <div className="flex justify-center mb-4 mt-2">

        <Image
          src="/img/logo.jpeg"
          alt="SSL"
          className="h-60 object-contain" // Increased height from h-12 to h-16
          width={240} // Specify width
          height={240} // Specify height
        />
      </div>
        <h2 className="text-xl font-bold mb-4 text-center">Iniciar Sesión</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email" // Changed type to email
          placeholder="Correo Electrónico" // Changed placeholder
          value={email} // Bind to email state
          onChange={(e) => setEmail(e.target.value)} // Use setEmail
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
        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-red-500 text-white py-2 rounded mt-2 flex items-center justify-center"
        >
          {/* You can add a Google Icon here */}
          <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 256S109.8 0 244 0c73 0 135.3 29.7 181.4 78.2l-62.9 54.4c-24.4-23.3-58.4-37.8-98.5-37.8-74.8 0-136.5 61.5-136.5 137S144.7 384 219.5 384c43.4 0 79.7-14.7 105.8-39.2l64.3 64.3C380.8 468.8 318.2 512 244 512zM445.9 261.8h-201.9v-87.1h114.3c-4.8-30.3-19.1-56.6-41.3-76.1l64.3-64.3C404.6 86.6 445.9 169.3 445.9 261.8z"/></svg>
          Ingresar con Google
        </button>
        
      </div>
    </div>
  );
}
