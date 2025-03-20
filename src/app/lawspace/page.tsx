'use client'

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import FloatingTimer from '@/components/FloatingTimer';
import TimeEntryCalendar from '@/components/Calendar';
import timeEntryService, { TimeEntryResponse } from '@/services/timeEntryService';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserData } from '@/services/authService';

interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  color?: string; 
}

// Definir los colores de estado para las tareas
const STATUS_COLORS: Record<string, string> = {
  'En proceso': '#FFD700', // Amarillo
  'Finalizado': '#4CAF50', // Verde
  'Vencido': '#F44336',    // Rojo
  'Cancelado': '#9E9E9E',  // Gris
  'Gestionar al cliente': '#9C27B0', // Morado
  // Color por defecto para estados no reconocidos
  'default': '#666666'
};

// Función para obtener el color según el estado
const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || STATUS_COLORS['default'];
};


// Generate a palette of highly distinguishable colors
const generateColorPalette = (count: number): string[] => {
  const palette: string[] = [];
  
  // Use golden ratio to create well-distributed hues
  const goldenRatioConjugate = 0.618033988749895;
  let h = Math.random(); // Random starting hue
  
  for (let i = 0; i < count; i++) {
    // Use golden ratio to get well-distributed hues
    h = (h + goldenRatioConjugate) % 1;
    
    // Vary saturation and lightness to create more distinct colors
    const s = 0.5 + 0.3 * ((i * 3) % 5) / 4; // Saturation between 0.5 and 0.8
    const l = 0.4 + 0.2 * ((i * 7) % 6) / 5; // Lightness between 0.4 and 0.6
    
    // Convert HSL to RGB
    const rgb = hslToRgb(h, s, l);
    const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
    
    palette.push(hexColor);
  }
  
  // Shuffle the palette to ensure that similar colors are not adjacent
  return shuffleArray(palette);
};

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper function to convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Pre-generate a large palette of colors (for up to 300 clients)
const COLOR_PALETTE = generateColorPalette(300);

// Define roles with elevated access (can see all tasks and time entries)
const ELEVATED_ROLES = ['senior', 'socio', 'consultor'];

interface TimeEntry {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Workspace: React.FC = () => {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]); // Keep track of all tasks for filtering time entries
  const [timeEntries, setTimeEntries] = useState<TimeEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userClients, setUserClients] = useState<string[]>([]);
  // New state for users and their colors
  const [users, setUsers] = useState<User[]>([]);
  const [userColorMap, setUserColorMap] = useState<Record<number, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for client filtering (for elevated roles only)
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filteredTimeEntries, setFilteredTimeEntries] = useState<TimeEntryResponse[]>([]);

  // Function to get the token from cookies
  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  // Check if user has elevated permissions
  const hasElevatedPermissions = useCallback(() => {
    return user && ELEVATED_ROLES.includes(user.role.toLowerCase());
  }, [user]);

  // Fetch user's assigned clients
  const fetchUserClients = useCallback(async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/users/assigned_clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user clients:', error);
      return [];
    }
  }, []);

  // Fetch all users and assign colors
  const fetchUsers = useCallback(async (token: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/get_all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const fetchedUsers = response.data;
      
      // Create a map of user IDs to colors for easy lookup
      const colorMap: Record<number, string> = {};
      
      // Process users and their colors
      const usersWithColors = fetchedUsers.map((user: User) => {
        // If the user already has a color from the API, use it
        // Otherwise use one from our color palette
        if (!user.color) {
          const index = Math.floor(Math.random() * COLOR_PALETTE.length);
          user.color = COLOR_PALETTE[index];
        }
        
        // Ensure user ID is a number
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        colorMap[userId] = user.color;
        
        return user;
      });
      
      console.log('Users with colors:', usersWithColors);
      console.log('Generated userColorMap:', colorMap);
      
      setUsers(usersWithColors);
      setUserColorMap(colorMap);
      
      return colorMap;
    } catch (error) {
      console.error('Error fetching users:', error);
      return {};
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Fetch tasks data
  const fetchData = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const userColors = await fetchUsers(token);
      
      let clients: string[] = [];
      if (user && !hasElevatedPermissions()) {
        clients = await fetchUserClients(token);
        setUserClients(clients);
      }

      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawTasks = response.data;
      
      if (hasElevatedPermissions()) {
        const uniqueClients = [...new Set(rawTasks.map((task: Task) => task.client))].sort() as string[];
        setAvailableClients(uniqueClients);
      }
      
      setAllTasks(rawTasks);

      let filteredTasks = rawTasks;
      if (user && !hasElevatedPermissions()) {
        filteredTasks = rawTasks.filter((task: Task) => 
          clients.includes(task.client)
        );
      }

      setTasks(filteredTasks);
      setFilteredTasks(filteredTasks);
      setError(null);
      
      fetchTimeEntries(filteredTasks, userColors);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Check if error is due to authentication
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Unauthorized, token might be expired
        router.push('/login');
      } else {
        setError('No se pudieron cargar las tareas. Por favor, inténtalo más tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, hasElevatedPermissions, user, fetchUserClients]);

  // Check authentication and fetch data on component mount
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const token = getToken();
      
      if (!token) {
        // No token found, redirect to login
        router.push('/login');
        return;
      }
      
      // If token exists, make sure we have user data
      if (!user) {
        try {
          const userData = await getUserData(token);
          setUser(userData, token);
        } catch (error) {
          console.error('Error fetching user data:', error);
          router.push('/login');
          return;
        }
      }
      
      // If we have token and user, proceed to fetch data
      fetchData(token);
    };
    
    checkAuthAndFetchData();
  }, [getToken, router, user, setUser, fetchData]);


  // Fetch time entries from API
  const fetchTimeEntries = useCallback(async (userTasks = filteredTasks, userColors = userColorMap) => {
    setIsLoadingEntries(true);
    try {
      const entries = await timeEntryService.getAllTimeEntries();
      
      let filteredEntries;
      if (user && !hasElevatedPermissions()) {
        if (userClients.length > 0) {
          const userTaskIds = allTasks
            .filter(task => userClients.includes(task.client))
            .map(task => task.id);
          
          filteredEntries = entries.filter(entry => userTaskIds.includes(entry.task_id));
        } else {
          const userTaskIds = userTasks.map(task => task.id);
          filteredEntries = entries.filter(entry => userTaskIds.includes(entry.task_id));
        }
      } else {
        filteredEntries = entries;
      }
      
      setTimeEntries(filteredEntries);
      setFilteredTimeEntries(filteredEntries);
      
      // Log for debugging
      console.log('Current userColorMap:', userColors);
      console.log('Filtered time entries:', filteredEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Error al cargar los registros de tiempo del servidor');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [tasks, user, hasElevatedPermissions, userClients, allTasks, userColorMap]);

  // Handle refresh of time entries (e.g. from Calendar component)
  const handleRefreshTimeEntries = useCallback(() => {
    const token = getToken();
    // Refresh users and their colors when refreshing time entries
    fetchUsers(token).then(() => {
      fetchTimeEntries();
    });
  }, [fetchTimeEntries, fetchUsers, getToken]);

  // Handle creation of new time entries
  const handleTimeEntryCreate = async (entry: TimeEntry) => {
    try {
      if (entry.start_time && entry.end_time) {
        await timeEntryService.create({
          task_id: entry.taskId,
          start_time: entry.start_time,
          end_time: entry.end_time
        });
        
        // Refresh time entries after creating a new one
        fetchTimeEntries();
        return; // Return void to match the expected type
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      setError('Error al guardar el registro de tiempo en el servidor');
      throw error; // Re-throw the error so the modal can handle it
    }
  };

  // Handle client filter change (for elevated roles only)
  const handleClientFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientName = event.target.value === "all" ? null : event.target.value;
    setSelectedClient(clientName);
    
    if (clientName) {
      const clientTasks = allTasks.filter(task => task.client === clientName);
      setFilteredTasks(clientTasks);
      
      const taskIds = clientTasks.map(task => task.id);
      const clientTimeEntries = timeEntries.filter(entry => taskIds.includes(entry.task_id));
      setFilteredTimeEntries(clientTimeEntries);
    } else {
      setFilteredTasks(allTasks);
      setFilteredTimeEntries(timeEntries);
    }
  }, [allTasks, timeEntries]);

  // Function to get user name by ID
  const getUserName = useCallback((userId: number): string => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.username : `Usuario ${userId}`;
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 text-black">
      <h1 className="text-2xl font-bold mb-4">Espacio de Trabajo</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Client filter dropdown (only for elevated roles) */}
      {hasElevatedPermissions() && (
        <div className="mb-6">
          <label htmlFor="client-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Cliente:
          </label>
          <select
            id="client-filter"
            className="block w-full md:w-1/3 lg:w-1/4 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            onChange={handleClientFilterChange}
            value={selectedClient || "all"}
          >
            <option value="all">Todos los Clientes</option>
            {availableClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          Tareas {!hasElevatedPermissions() && "de Tus Clientes Asignados"}
          {hasElevatedPermissions() && selectedClient ? `del Cliente: ${selectedClient}` : hasElevatedPermissions() ? " (Todas)" : ""}
        </h2>
        {filteredTasks.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No hay tareas disponibles. {!hasElevatedPermissions() && "Contacta a un abogado senior o socio para que te asignen clientes."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${getStatusColor(task.status)}` }}
            >
              <h3 className="font-medium text-lg">{task.title}</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p><span className="font-medium">Estado:</span> {task.status}</p>
                <p><span className="font-medium">Fecha de Vencimiento:</span> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</p>
                <p><span className="font-medium">Cliente:</span> {task.client}</p>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Calendar showing time entries from API */}
      <div>
        <h2 className="text-xl font-semibold mb-3">
          Registros de Tiempo {!hasElevatedPermissions() && "de Tus Clientes"}
          {hasElevatedPermissions() && selectedClient ? `del Cliente: ${selectedClient}` : hasElevatedPermissions() ? " (Todos)" : ""}
        </h2>
        <TimeEntryCalendar 
          apiTimeEntries={filteredTimeEntries} 
          tasks={filteredTasks}
          isLoading={isLoadingEntries || isLoadingUsers} 
          onRefresh={handleRefreshTimeEntries}
          onTimeEntryCreate={handleTimeEntryCreate}
          userMap={getUserName}
          currentUserId={user?.id ? Number(user.id) : undefined}
          userColorMap={userColorMap}
        />
      </div>

      {/* Draggable timer for creating time entries */}
      <FloatingTimer tasks={filteredTasks} onTimeEntryCreate={handleTimeEntryCreate} onEntryCreated={fetchTimeEntries} />
    </div>
  );
};

export default Workspace;
