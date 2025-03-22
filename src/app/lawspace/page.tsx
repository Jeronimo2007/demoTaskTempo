
'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import FloatingTimer from '@/components/FloatingTimer';
import TimeEntryCalendar from '@/components/Calendar';
import timeEntryService, { TimeEntryResponse } from '@/services/timeEntryService';
import taskService, { AssignedTask } from '@/services/taskService';
import clientService from '@/services/clientService';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserData } from '@/services/authService';
import { Task } from '@/types/task'; // Import Task from types file

interface User {
  id: number | string;
  username: string;
  role: string;
  color?: string;
}

interface Client {
  id: number;
  name: string;
  // Add other client properties as needed
}

interface ClientResponse {
  id: number;
  name?: string;
  nombre?: string;
  client_name?: string;
  [key: string]: any;
}

const STATUS_COLORS: Record<string, string> = {
  'En proceso': '#FFD700',
  'Finalizado': '#4CAF50',
  'Vencido': '#F44336',
  'Cancelado': '#9E9E9E',
  'Gestionar al cliente': '#9C27B0',
  'default': '#666666'
};

const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || STATUS_COLORS['default'];
};

const generateColorPalette = (count: number): string[] => {
  const palette: string[] = [];
  const goldenRatioConjugate = 0.618033988749895;
  let h = Math.random();

  for (let i = 0; i < count; i++) {
    h = (h + goldenRatioConjugate) % 1;
    const s = 0.5 + 0.3 * ((i * 3) % 5) / 4;
    const l = 0.4 + 0.2 * ((i * 7) % 6) / 5;
    const rgb = hslToRgb(h, s, l);
    const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
    palette.push(hexColor);
  }

  return shuffleArray(palette);
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const COLOR_PALETTE = generateColorPalette(300);

const ELEVATED_ROLES = ['senior', 'socio'];

interface TimeEntry {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  description?: string; // Add description field
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TaskSkeleton = () => (
  <div className="border rounded-lg p-4 shadow-sm animate-pulse">
    <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      <div className="h-4 bg-gray-100 rounded w-1/3"></div>
    </div>
  </div>
);

const DropdownSkeleton = () => (
  <div className="mb-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded mb-2 w-1/4"></div>
    <div className="h-10 bg-gray-100 rounded w-1/3"></div>
  </div>
);

const Workspace: React.FC = () => {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userColorMap, setUserColorMap] = useState<Record<number, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [assignedClientIds, setAssignedClientIds] = useState<number[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  interface ClientOption {
    id: number;
    label: string;
  }

  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filteredTimeEntries, setFilteredTimeEntries] = useState<TimeEntryResponse[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<TimeEntryResponse[]>([]);
  const calendarRef = useRef<any>(null);

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  const hasElevatedPermissions = useCallback(() => {
    if (!user) return false;
    const userRole = user.role.toLowerCase();
    return ELEVATED_ROLES.includes(userRole);
  }, [user]);


  // Function to fetch clients with improved logging
  // Removed fetchClientDirectly as it's now handled by the enhanced clientService

  const fetchClients = useCallback(async (token: string) => {
    setIsLoadingClients(true);
    try {
      console.log('🔍 Starting client fetch process...');

      // Use the enhanced clientService to get all clients
      const clientsData = await clientService.getAllClients();
      console.log('📊 Raw client data received:', clientsData.length, 'clients');

      // Log the first few clients to inspect their structure
      if (clientsData.length > 0) {
        console.log('📋 Sample client data:', JSON.stringify(clientsData.slice(0, 3)));
      }

      const clientsMap: Record<number, Client> = {};

      clientsData.forEach((client: Client) => {
        clientsMap[client.id] = client;
        // Log each client being added to the map
        console.log(`🔄 Adding client to map: ID=${client.id}, Name=${client.name}`);
      });

      console.log('🗂️ Clients map created with keys:', Object.keys(clientsMap).length);
      console.log('🔑 Client map keys:', Object.keys(clientsMap));
      setClients(clientsMap);
      return clientsMap;
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      return {};
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  const fetchUsers = useCallback(async (token: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/get_all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedUsers = response.data;
      const colorMap: Record<number, string> = {};
      const usersWithColors = fetchedUsers.map((user: User) => {
        if (!user.color) {
          const index = Math.floor(Math.random() * COLOR_PALETTE.length);
          user.color = COLOR_PALETTE[index];
        }
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        colorMap[userId] = user.color;
        return user;
      });
      setUsers(usersWithColors);
      setUserColorMap(colorMap);
      return colorMap;
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return {};
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchData = useCallback(async (token: string) => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    try {
      const isElevated = hasElevatedPermissions();
      const userColors = await fetchUsers(token);
      const clientsData = await fetchClients(token);

      console.log('Client data available for task processing:', Object.keys(clientsData).length, 'clients');

      // Get the current date
      const currentDate = new Date();
    
      // Calculate start of the week (Sunday)
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    
      // Calculate end of the week (Saturday)
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);
    
      console.log('🗓️ Fetching tasks with date range:', startDate.toISOString(), 'to', endDate.toISOString());

      // Obtener todas las tareas with date range
      const allTasksData = await taskService.getAllTasks(startDate, endDate);
      console.log('All tasks data received:', allTasksData.length, 'tasks');

      // Process tasks and add client information more efficiently
      const allTasksConverted = await Promise.all(allTasksData.map(async (task: any) => {
        // Make sure client_id is a number and not undefined
        const clientId = task.client_id !== undefined ? Number(task.client_id) : null;
        console.log(`🔄 Processing task ${task.id} with client_id: ${clientId}, client: ${task.client}`);

        // Use the client property directly if it exists, instead of looking up the name
        let clientName = 'Cliente no asignado';
        if (task.client) {
          console.log(`✅ Using existing client name from task: ${task.client}`);
          clientName = task.client;
        } else if (clientId) {
          console.log(`🔍 Looking up client name for ID: ${clientId}`);
          try {
            clientName = await clientService.getClientName(clientId);
            console.log(`✅ Found client name for ID ${clientId}: ${clientName}`);
          } catch (err) {
            console.error(`❌ Error getting client name for ID ${clientId}:`, err);
          }
        } else {
          console.log(`⚠️ Task ${task.id} has no client_id or client, using default name`);
        }

        return {
          ...task,
          client_id: clientId,
          client_name: clientName
        };
      }));

      if (allTasksConverted.length > 0) {
        console.log('Sample converted task:', allTasksConverted[0]);
      } else {
        console.log('No tasks found to convert');
      }

      setAllTasks(allTasksConverted);

      // Para usuarios con permisos elevados, mostrar todas las tareas
      if (isElevated) {
        // Obtener nombres de cliente únicos para el filtro
        const uniqueClientNames = [...new Set(allTasksConverted
          .filter(task => task.client) // Filtra tareas que tienen la propiedad client
          .map(task => task.client))]; // Extrae los nombres de cliente

        console.log('Unique client names from tasks:', uniqueClientNames);

        // Crear opciones para el dropdown de filtro usando los nombres directamente
        const clientOptions = uniqueClientNames.map(clientName => {
          console.log(`🔄 Creating client option: Name=${clientName}`);
          return {
            id: clientName, // Usamos el nombre como ID para simplificar
            label: clientName
          };
        });

        console.log('Client options created:', clientOptions);
        setAvailableClients(clientOptions);
        setTasks(allTasksConverted);
        setFilteredTasks(allTasksConverted);
        setError(null);

        // Fetch all time entries for all tasks
        fetchTimeEntries(allTasksConverted, userColors);
        return;
      }

      // Para usuarios sin permisos elevados, obtener tareas asignadas usando el nuevo endpoint
      try {
        // Pass the current user ID to getAssignedTasks
        const userId = user.id;
        console.log('Obteniendo tareas asignadas para el usuario ID:', userId);

        const assignedTasks = await taskService.getAssignedTasks(userId);
        console.log('Tareas asignadas recibidas:', assignedTasks);

        if (assignedTasks && assignedTasks.length > 0) {
          // Extraer los IDs de las tareas asignadas
          const assignedTaskIds = assignedTasks.map(item => item.task_id);

          // Extraer los IDs de cliente únicos de las tareas asignadas
          const clientIds = [...new Set(assignedTasks.map(item => item.client_id))];
          setAssignedClientIds(clientIds);

          // Filtrar tareas por los IDs de tareas asignadas
          const filteredTasks = allTasksConverted.filter((task: Task) =>
            assignedTaskIds.includes(task.id)
          );

          // Actualizar estados
          setTasks(filteredTasks);
          setFilteredTasks(filteredTasks);
          setError(null);

          // Fetch all time entries for the filtered tasks
          // This will get ALL time entries for these tasks, not just the user's own entries
          fetchTimeEntries(filteredTasks, userColors);
          return;
        } else {
          // Si no hay tareas asignadas, mostrar un array vacío
          setTasks([]);
          setFilteredTasks([]);
          fetchTimeEntries([], userColors);
        }
      } catch (error) {
        console.error('Error al obtener tareas asignadas:', error);

        // En caso de error al obtener tareas asignadas, no mostrar ninguna tarea
        setTasks([]);
        setFilteredTasks([]);
        setError('Error al obtener tareas asignadas. Por favor, inténtalo más tarde.');
        fetchTimeEntries([], userColors);
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push('/login');
      } else {
        setError('No se pudieron cargar las tareas. Por favor, inténtalo más tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, hasElevatedPermissions, fetchUsers, router]);

  React.useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      if (!user) {
        try {
          const userData = await getUserData(token);
          if (!userData || !userData.id || !userData.role) {
            setError('Error: Información de usuario incompleta. Contacta al administrador.');
            setIsLoading(false);
            return;
          }
          setUser(userData, token);
          return;
        } catch (error) {
          console.error('Error al obtener datos de usuario:', error);
          router.push('/login');
          return;
        }
      }

      if (!user.role) {
        setError('Error: Información de rol de usuario no disponible. Contacta al administrador.');
        setIsLoading(false);
        return;
      }

      fetchData(token);
    };

    checkAuthAndFetchData();
  }, [getToken, router, user, setUser, fetchData]);

  
const fetchTimeEntries = useCallback(async (
  userTasks = filteredTasks, 
  userColors = userColorMap,
  startDate?: Date,
  endDate?: Date
) => {
  if (!user) {
    return;
  }

  setIsLoadingEntries(true);
  try {
    // If dates aren't provided, calculate current week's range
    if (!startDate || !endDate) {
      const currentDate = new Date();
      
      // Calculate start of week (Sunday)
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      
      // Calculate end of week (Saturday)
      endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`📅 Fetching time entries for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get time entries for the specified date range
    const entries = await timeEntryService.getTimeEntriesByDateRange(startDate, endDate);
    console.log('Total time entries fetched:', entries.length);

    // Get the task IDs from the provided tasks
    const taskIds = userTasks.map(task => task.id);
    console.log('Current task IDs for filtering:', taskIds);

    // Filter time entries to only include those for the current tasks
    const filteredEntries = entries.filter(entry => taskIds.includes(entry.task_id));
    console.log(`Filtered ${entries.length} time entries to ${filteredEntries.length} entries for the current tasks`);

    setTimeEntries(entries); // Store all entries
    setFilteredTimeEntries(filteredEntries); // Store filtered entries for display
    setCalendarEntries(filteredEntries); // Update calendar entries

    // If calendar ref exists, update it directly
    if (calendarRef.current && calendarRef.current.updateEntries) {
      calendarRef.current.updateEntries(filteredEntries);
    }
  } catch (error) {
    console.error('Error al obtener registros de tiempo:', error);
    setError('Error al cargar los registros de tiempo del servidor');
  } finally {
    setIsLoadingEntries(false);
  }
}, [user, filteredTasks, userColorMap]);

// Update handleRefreshTimeEntries to use the new date parameters
const handleRefreshTimeEntries = useCallback(async (startDate?: Date, endDate?: Date) => {
  console.log('🔄 Refreshing time entries...');
  try {
    const token = getToken();
    await Promise.all([
      fetchUsers(token),
      fetchClients(token)
    ]);

    // If startDate and endDate weren't provided, use current week
    if (!startDate || !endDate) {
      const currentDate = new Date();
      
      // Calculate start of week (Sunday)
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      
      // Calculate end of week (Saturday)
      endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);
    }

    console.log('🗓️ Date range for task fetch:', startDate.toISOString(), 'to', endDate.toISOString());

    // Refresh task list with date range
    const allTasksData = await taskService.getAllTasks(startDate, endDate);
    
    // Process tasks and add client information
    const allTasksConverted = await Promise.all(allTasksData.map(async (task: any) => {
      const clientId = task.client_id !== undefined ? Number(task.client_id) : null;
      
      let clientName = 'Cliente no asignado';
      if (task.client) {
        clientName = task.client;
      } else if (clientId) {
        try {
          clientName = await clientService.getClientName(clientId);
        } catch (err) {
          console.error(`❌ Error getting client name for ID ${clientId}:`, err);
        }
      }

      return {
        ...task,
        client_id: clientId,
        client_name: clientName
      };
    }));
    
    // Update allTasks state
    setAllTasks(allTasksConverted);

    // Get time entries for the specified date range
    const allTimeEntries = await timeEntryService.getTimeEntriesByDateRange(startDate, endDate);
    console.log(`✅ Received ${allTimeEntries.length} time entries from API`);

    // Update state with all time entries
    setTimeEntries(allTimeEntries);

    // Check if user has elevated permissions
    const isElevated = hasElevatedPermissions();
    
    // For users with elevated permissions
    if (isElevated) {
      // If there's a selected client, apply that filter
      if (selectedClient) {
        console.log(`🔍 Re-applying filter for client: ${selectedClient}`);

        // Filter tasks by selected client
        const clientTasks = allTasksConverted.filter(task => task.client === selectedClient);
        console.log(`📊 Tasks filtered for client ${selectedClient}:`, clientTasks.length);

        // Get task IDs for filtered tasks
        const taskIds = clientTasks.map(task => task.id);

        // Filter time entries for selected client's tasks
        const clientTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));
        console.log(`📊 Time entries filtered for client ${selectedClient}:`, clientTimeEntries.length);

        // Update states with filtered entries
        setFilteredTimeEntries(clientTimeEntries);
        setCalendarEntries(clientTimeEntries);
        setFilteredTasks(clientTasks);

        // Update calendar with filtered entries
        if (calendarRef.current && calendarRef.current.updateEntries) {
          calendarRef.current.updateEntries(clientTimeEntries);
        }
      } else {
        // If no client selected, show all entries for available tasks
        setFilteredTasks(allTasksConverted);
        
        const taskIds = allTasksConverted.map(task => task.id);
        const allTaskTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));

        // Update states with all entries
        setFilteredTimeEntries(allTaskTimeEntries);
        setCalendarEntries(allTaskTimeEntries);

        // Update calendar with all entries
        if (calendarRef.current && calendarRef.current.updateEntries) {
          calendarRef.current.updateEntries(allTaskTimeEntries);
        }
      }
    } 
    // For users without elevated permissions - only show their assigned tasks
    else {
      // Fetch the user's assigned tasks
      const userId = user?.id;
      if (!userId) {
        console.error('❌ User ID not available');
        return false;
      }
      
      console.log('👤 Fetching assigned tasks for user ID:', userId);
      const assignedTasks = await taskService.getAssignedTasks(userId);
      
      if (assignedTasks && assignedTasks.length > 0) {
        // Extract the task IDs that are assigned to this user
        const assignedTaskIds = assignedTasks.map(item => item.task_id);
        console.log(`✅ Found ${assignedTaskIds.length} assigned tasks for user ${userId}`);
        
        // Filter all tasks to only include those assigned to the user
        const userTasks = allTasksConverted.filter(task => assignedTaskIds.includes(task.id));
        console.log(`📊 Filtered to ${userTasks.length} tasks assigned to user`);
        
        // Get time entries only for the user's assigned tasks
        const taskIds = userTasks.map(task => task.id);
        const userTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));
        console.log(`📊 Filtered to ${userTimeEntries.length} time entries for user's tasks`);
        
        // Update states with user's tasks and entries
        setTasks(userTasks);
        setFilteredTasks(userTasks);
        setFilteredTimeEntries(userTimeEntries);
        setCalendarEntries(userTimeEntries);
        
        // Update calendar with user's entries
        if (calendarRef.current && calendarRef.current.updateEntries) {
          calendarRef.current.updateEntries(userTimeEntries);
        }
      } else {
        console.log('⚠️ No assigned tasks found for user');
        // If no assigned tasks, show empty arrays
        setTasks([]);
        setFilteredTasks([]);
        setFilteredTimeEntries([]);
        setCalendarEntries([]);
        
        // Update calendar with empty array
        if (calendarRef.current && calendarRef.current.updateEntries) {
          calendarRef.current.updateEntries([]);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error refreshing time entries:', error);
    return false;
  }
}, [allTasks, selectedClient, hasElevatedPermissions, user, fetchUsers, fetchClients, getToken]);

// Update handleTimeEntryCreate to refresh with current date range
const handleTimeEntryCreate = async (entry: TimeEntry): Promise<void> => {
  try {
    if (entry.start_time && entry.end_time) {
      console.log('🔄 Creating new time entry:', entry);
      await timeEntryService.create({
        task_id: entry.taskId,
        start_time: entry.start_time,
        end_time: entry.end_time,
        description: entry.description || '' // Include description, default to empty string if not provided
      });

      // Get the current week's date range for refresh
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);

      // Refresh time entries with current week's date range
      await handleRefreshTimeEntries(startDate, endDate);
      return;
    }
  } catch (error) {
    console.error('❌ Error al guardar registro de tiempo:', error);
    setError('Error al guardar el registro de tiempo en el servidor');
    throw error;
  }
};


  const handleClientFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientValue = event.target.value;
    console.log(`🔍 Client filter changed to: ${clientValue}`);
    setSelectedClient(clientValue === "all" ? null : clientValue);

    if (clientValue !== "all") {
      console.log('🔍 Filtering by client name:', clientValue);
      console.log('📋 Available clients:', JSON.stringify(availableClients));

      // 1. Filtrar tareas por el cliente seleccionado
      const clientTasks = allTasks.filter(task => task.client === clientValue);
      console.log('📊 Tasks filtered for client name', clientValue, ':', clientTasks.length);
      console.log('📋 Sample filtered task:', clientTasks.length > 0 ? JSON.stringify(clientTasks[0]) : 'No tasks');

      // 2. Obtener los IDs de las tareas filtradas
      const taskIds = clientTasks.map(task => task.id);
      console.log('🔑 Task IDs for filtered tasks:', taskIds);

      // 3. Filtrar time entries que correspondan a las tareas del cliente seleccionado
      const clientTimeEntries = timeEntries.filter(entry => taskIds.includes(entry.task_id));
      console.log(`📊 Time entries filtered for client ${clientValue}:`, clientTimeEntries.length);

      // 4. Actualizar el estado con las tareas y time entries filtrados
      setFilteredTasks(clientTasks);
      setFilteredTimeEntries(clientTimeEntries);
      setCalendarEntries(clientTimeEntries);

      // 5. Actualizar el calendario directamente a través de la referencia
      if (calendarRef.current && calendarRef.current.updateEntries) {
        console.log('🔄 Updating calendar component with filtered entries');
        calendarRef.current.updateEntries(clientTimeEntries);
      }
    } else {
      console.log('🔄 Showing all tasks and time entries');

      // Mostrar todas las tareas
      setFilteredTasks(allTasks);

      // Mostrar todas las entradas de tiempo relacionadas con todas las tareas
      const taskIds = allTasks.map(task => task.id);
      const allTaskTimeEntries = timeEntries.filter(entry => taskIds.includes(entry.task_id));
      console.log(`📊 Showing all time entries for all tasks: ${allTaskTimeEntries.length}`);

      // Actualizar estados
      setFilteredTimeEntries(allTaskTimeEntries);
      setCalendarEntries(allTaskTimeEntries);

      // Actualizar el calendario directamente
      if (calendarRef.current && calendarRef.current.updateEntries) {
        console.log('🔄 Updating calendar component with all entries');
        calendarRef.current.updateEntries(allTaskTimeEntries);
      }
    }
  }, [allTasks, timeEntries, availableClients]);

  const getUserName = useCallback((userId: number): string => {
    const foundUser = users.find(u => {
      const uid = typeof u.id === 'string' ? parseInt(u.id, 10) : u.id;
      return uid === userId;
    });
    return foundUser ? foundUser.username : `Usuario ${userId}`;
  }, [users]);

  // Helper function to get client name with improved implementation
  const getClientName = useCallback(async (clientId: number | undefined): Promise<string> => {
    console.log(`🔍 getClientName called with clientId: ${clientId}`);

    if (!clientId) {
      console.log('⚠️ Invalid client ID, returning default name');
      return 'Cliente no asignado';
    }

    try {
      const name = await clientService.getClientName(clientId);
      console.log(`✅ Retrieved client name for ID ${clientId}: ${name}`);
      return name;
    } catch (err) {
      console.error(`❌ Error in getClientName for ID ${clientId}:`, err);
      return `Cliente ${clientId}`;
    }
  }, []);

  if (isLoading && !user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mb-4"></div>
        <p className="text-lg">Cargando espacio de trabajo...</p>
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
      {hasElevatedPermissions() && (
        isLoading ? (
          <DropdownSkeleton />
        ) : (
          <div className="mb-6">
            <label htmlFor="client-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Cliente:
            </label>
            <select
              id="client-filter"
              className="block w-full md:w-1/3 lg:w-1/4 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              onChange={handleClientFilterChange}
              value={selectedClient || "all"}
              disabled={isLoading}
            >
              <option value="all">Todos los Clientes</option>
              {availableClients.map(client => (
                <option key={client.id} value={client.id}>{client.label}</option>
              ))}
            </select>
          </div>
        )
      )}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          Tareas {!hasElevatedPermissions() && "Asignadas"}
          {hasElevatedPermissions() && selectedClient ? `del Cliente: ${selectedClient}` : hasElevatedPermissions() ? " (Todas)" : ""}
          {isLoading && (
            <span className="ml-3">
              <div className="h-4 w-4 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            </span>
          )}
        </h2>

        {isLoading || isLoadingClients ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <TaskSkeleton key={index} />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-gray-500 p-4 text-center bg-gray-50 rounded-lg border border-gray-100">
            No hay tareas disponibles. {!hasElevatedPermissions() && "Contacta a un abogado senior o socio para que te asignen tareas."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              return (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  style={{ borderLeft: `4px solid ${getStatusColor(task.status)}` }}
                >
                  <h3 className="font-medium text-lg">{task.title}</h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p><span className="font-medium">Estado:</span> {task.status}</p>
                    <p><span className="font-medium">Fecha de Vencimiento:</span> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</p>
                    <p><span className="font-medium">Cliente:</span> {task.client_name || 'Cliente no asignado'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          Registros de Tiempo {!hasElevatedPermissions() && "de Tus Tareas Asignadas"}
          {hasElevatedPermissions() && selectedClient ? `del Cliente: ${selectedClient}` : hasElevatedPermissions() ? " (Todos)" : ""}
          {(isLoadingEntries || isLoadingUsers) && (
            <span className="ml-3 flex items-center">
              <div className="h-4 w-4 border-t-2 border-blue-500 rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-500">
                {isLoadingUsers ? 'Cargando usuarios...' : 'Actualizando registros...'}
              </span>
            </span>
          )}
        </h2>
        <TimeEntryCalendar
          ref={calendarRef}
          apiTimeEntries={calendarEntries}
          tasks={filteredTasks}
          isLoading={isLoadingEntries || isLoadingUsers || isLoadingClients}
          onRefresh={handleRefreshTimeEntries}
          onTimeEntryCreate={handleTimeEntryCreate}
          userMap={getUserName}
          currentUserId={user?.id ? Number(user.id) : undefined}
          userColorMap={userColorMap}
        />
      </div>
      {!isLoading && filteredTasks.length > 0 && (
        <FloatingTimer
          tasks={filteredTasks}
          onTimeEntryCreate={handleTimeEntryCreate}
          onEntryCreated={fetchTimeEntries}
        />
      )}
    </div>
  );
};

export default Workspace;
