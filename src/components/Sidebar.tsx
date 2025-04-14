"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const { user } = useAuthStore();
  const router = useRouter();

  console.log("Rendering Sidebar, user:", user); 

  return (
    <aside className="min-h-screen w-64 bg-gray-900 text-white flex flex-col p-4">
      {/* Logo de Task Tempo en la parte superior */}
      <div className="flex justify-center mb-4 mt-2">
        <img 
          src="/img/TaskTempoLogo.png" 
          alt="Task Tempo Logo" 
          className="h-60 object-contain" // Increased height from h-12 to h-16
        />
      </div>
      
      <div className="mb-6 mt-2 ml-5">
        {user ? (
          <h1 className="text-xl font-bold text-white">{user.username}</h1> 
        ) : (
          <div className="flex items-center">
            <span className="mr-2">Cargando...</span>
            <div className="loader"></div> 
          </div>
        )}
      </div>
      <nav className="flex flex-col space-y-2">
      {user && ['admin', 'socio', 'senior'].includes(user.role) && (
        <button
          onClick={() => router.push("/lawspace/dashboard")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Dashboard
        </button>)}
        {user && ['admin', 'socio', 'senior', 'consultor'].includes(user.role) && (
        <button
          onClick={() => router.push("/lawspace/dashboard/admin_panel")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Panel de Administración
        </button>)}
        {user && ['admin', 'socio', 'senior','consultor','junior','auxiliar'].includes(user.role) && (
        <button
          onClick={() => router.push("/lawspace")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Espacio de Trabajo
        </button>)}
        {user && ['admin', 'socio', 'senior'].includes(user.role) && (
        <button
          onClick={() => router.push("/lawspace/dashboard/admin_panel/events_panel")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Eventos
        </button>)}
        
        {/* Add more buttons here as needed */}
      </nav>
    </aside>
  );
}
