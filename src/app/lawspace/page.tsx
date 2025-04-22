'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import TimeEntryCalendar from '@/components/Calendar';
import timeEntryService, { TimeEntryResponse, TimeEntryUpdate } from '@/services/timeEntryService'; // Import TimeEntryUpdate
import taskService from '@/services/taskService';
import clientService from '@/services/clientService';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserData } from '@/services/authService';
import { Task } from '@/types/task';

interface User {
  id: number | string;
  username: string;
  role: string;
  color?: string;
}

interface Client {
  id: number;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  'En proceso': '#FFD700',
  'Finalizado': '#4CAF50',
  'Vencido': '#F44336',
  'Cancelado': '#9E9E9E',
  'Gestionar al cliente': '#9C27B0',
  'Gestionar al tercero': '#FF69B4',
  'default': '#666666'
};

const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || STATUS_COLORS['default'];
};

const ELEVATED_ROLES = ['senior', 'socio'];

interface TimeEntry {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  description?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface CalendarRef {
  updateEntries: (entries: TimeEntryResponse[]) => void;
}

const Workspace: React.FC = () => {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userColorMap, setUserColorMap] = useState<Record<number, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 6; // Number of tasks per page, adjust as needed

  interface ClientOption {
    id: string;
    label: string;
  }

  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<TimeEntryResponse[]>([]);
  const calendarRef = useRef<CalendarRef | null>(null);

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

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const clientsData = await clientService.getAllClients();
      const clientsMap: Record<number, Client> = {};

      clientsData.forEach((client: Client) => {
        clientsMap[client.id] = client;
      });

      return clientsMap;
    } catch (error) {
      console.error('Error fetching clients:', error);
      return {};
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  const fetchUsers = useCallback(async (token: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/get_users_B`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedUsers = response.data as User[];
      const colorMap: Record<number, string> = {};
      const usersWithColors = fetchedUsers.map((user: User) => {
        if (!user.color) {
          user.color = '#666666';
        }
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        colorMap[userId] = user.color;
        return user;
      });
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

  const fetchTimeEntries = useCallback(async (
    userTasks = filteredTasks, 
    startDate?: Date,
    endDate?: Date
  ) => {
    if (!user) return;

    setIsLoadingEntries(true);
    try {
      if (!startDate || !endDate) {
        const currentDate = new Date();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
        endDate.setHours(23, 59, 59, 999);
      }

      const entries = await timeEntryService.getTimeEntriesByDateRange(startDate, endDate);
      const taskIds = userTasks.map(task => task.id);
      const filteredEntries = entries.filter(entry => taskIds.includes(entry.task_id));

      setTimeEntries(entries);
      setCalendarEntries(filteredEntries);

      if (calendarRef.current?.updateEntries) {
        calendarRef.current.updateEntries(filteredEntries);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Error loading time entries from server');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, filteredTasks]);

  const fetchAllTasks = useCallback(async () => {
    try {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);

      const allTasksData = await taskService.getAllTasks(startDate, endDate);

      const allTasksConverted = await Promise.all(allTasksData.map(async (task: Task) => {
        const clientId = task.client_id !== undefined ? task.client_id : null;
        let clientName = 'Cliente no asignado';
        if (task.client) {
          clientName = task.client;
        } else if (clientId) {
          try {
            const client = await clientService.getClient(clientId);
            clientName = client ? client.name : 'Cliente no asignado';
          } catch (err) {
            console.error(`Error getting client name for ID ${clientId}:`, err);
          }
        }

        return {
          ...task,
          client_id: clientId,
          client_name: clientName
        } as Task;
      }));

      setAllTasks(allTasksConverted);
      const uniqueClientNames = [...new Set(allTasksConverted
        .filter(task => task.client)
        .map(task => task.client))] as string[];

      const clientOptions = uniqueClientNames
        .filter(Boolean)
        .map(clientName => ({
          id: clientName,
          label: clientName
        }));

      setAvailableClients(clientOptions);
      setFilteredTasks(allTasksConverted);
      setError(null);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      setError('Failed to load tasks. Please try again later.');
    }
  }, []);

  const fetchUserTasks = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) {
        setError('User ID not available');
        return;
      }

      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);

      const allTasksData = await taskService.getAllTasks(startDate, endDate);
      const assignedTasks = await taskService.getAssignedTasks(userId);

      const allTasksConverted = await Promise.all(allTasksData.map(async (task: Task) => {
        const clientId = task.client_id !== undefined ? task.client_id : null;
        let clientName = 'Cliente no asignado';
        if (task.client) {
          clientName = task.client;
        } else if (clientId) {
          try {
            const client = await clientService.getClient(clientId);
            clientName = client ? client.name : 'Cliente no asignado';
          } catch (err) {
            console.error(`Error getting client name for ID ${clientId}:`, err);
          }
        }

        return {
          ...task,
          client_id: clientId,
          client_name: clientName
        } as Task;
      }));

      setAllTasks(allTasksConverted);

      if (assignedTasks && assignedTasks.length > 0) {
        const assignedTaskIds = assignedTasks.map(item => item.task_id);
        const filteredTasks = allTasksConverted.filter((task: Task) =>
          assignedTaskIds.includes(task.id)
        );

        setFilteredTasks(filteredTasks);
        setError(null);
      } else {
        setFilteredTasks([]);
        setError('No tasks assigned to you.');
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      setFilteredTasks([]);
      setError('Failed to load tasks. Please try again later.');
    }
  }, [user?.id]);

  const fetchData = useCallback(async (token: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([
        fetchUsers(token),
        fetchClients(),
        fetchTimeEntries(),
      ]);

      if (hasElevatedPermissions()) {
        await fetchAllTasks();
      } else {
        await fetchUserTasks();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [user, hasElevatedPermissions, fetchUsers, fetchClients, fetchTimeEntries, fetchAllTasks, fetchUserTasks]);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      console.log('Starting authentication check...');
      
      // First check URL parameters for Google OAuth
      const searchParams = new URLSearchParams(window.location.search);
      const googleToken = searchParams.get('access_token');
      const userId = searchParams.get('user_id');
      const username = searchParams.get('username');
      const role = searchParams.get('role');

      console.log('Current URL:', window.location.href);
      console.log('Google OAuth Params:', {
        token: googleToken ? 'present' : 'missing',
        userId: userId ? 'present' : 'missing',
        username: username ? 'present' : 'missing',
        role: role ? 'present' : 'missing'
      });

      if (googleToken && userId && username && role) {
        console.log('Processing Google OAuth...');
        try {
          const user = {
            id: userId,
            username: username,
            role: role
          };
          console.log('Setting user from Google OAuth:', user);
          setUser(user, googleToken);
          
          // Set the token in cookies
          document.cookie = `token=${googleToken}; path=/; max-age=86400`; // 24 hours
          
          window.history.replaceState({}, '', '/lawspace');
          console.log('Fetching data with Google token...');
          await fetchData(googleToken);
          console.log('Google OAuth process completed successfully');
          return;
        } catch (err) {
          console.error("Error processing Google auth callback:", err);
          setError("Error al procesar la autenticación de Google");
        }
      }

      // If no Google OAuth parameters, check cookie token
      const token = getToken();
      console.log('Cookie token:', token ? 'present' : 'missing');
      
      if (!token) {
        console.log('No token found, redirecting to login...');
        router.push('/login');
        return;
      }

      if (!user) {
        console.log('No user in store, fetching user data...');
        try {
          const userData = await getUserData(token);
          console.log('Fetched user data:', userData);
          if (!userData || !userData.id || !userData.role) {
            console.error('Incomplete user data:', userData);
            setError('Error: Incomplete user information. Contact the administrator.');
            setIsLoading(false);
            return;
          }
          setUser(userData, token);
          return;
        } catch (error) {
          console.error('Error fetching user data:', error);
          router.push('/login');
          return;
        }
      }

      if (!user.role) {
        console.error('User role missing:', user);
        setError('Error: User role information not available. Contact the administrator.');
        setIsLoading(false);
        return;
      }

      // Only fetch data if we haven't already loaded it
      if (allTasks.length === 0 && timeEntries.length === 0) {
        console.log('Fetching initial data...');
        fetchData(token);
      }
    };

    checkAuthAndFetchData();
  }, [getToken, router, user, setUser, fetchData, allTasks.length, timeEntries.length]);

  const handleRefreshTimeEntries = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      const token = getToken();
      await Promise.all([
        fetchUsers(token),
        fetchClients()
      ]);

      if (!startDate || !endDate) {
        const currentDate = new Date();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
        endDate.setHours(23, 59, 59, 999);
      }

      const allTasksData = await taskService.getAllTasks(startDate, endDate);

      const allTasksConverted = await Promise.all(allTasksData.map(async (task: Task) => {
        const clientId = task.client_id !== undefined ? task.client_id : null;
        let clientName = 'Cliente no asignado';
        if (task.client) {
          clientName = task.client;
        } else if (clientId) {
          try {
            const client = await clientService.getClient(clientId);
            clientName = client ? client.name : 'Cliente no asignado';
          } catch (err) {
            console.error(`Error getting client name for ID ${clientId}:`, err);
          }
        }

        return {
          ...task,
          client_id: clientId,
          client_name: clientName
        } as Task;
      }));

      setAllTasks(allTasksConverted);

      const allTimeEntries = await timeEntryService.getTimeEntriesByDateRange(startDate, endDate);

      setTimeEntries(allTimeEntries);

      const isElevated = hasElevatedPermissions();

      if (isElevated) {
        if (selectedClient) {
          const clientTasks = allTasksConverted.filter(task => task.client === selectedClient);

          const taskIds = clientTasks.map(task => task.id);

          const clientTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));

          setCalendarEntries(clientTimeEntries);
          setFilteredTasks(clientTasks);

          if (calendarRef.current && calendarRef.current.updateEntries) {
            calendarRef.current.updateEntries(clientTimeEntries);
          }
        } else {
          setFilteredTasks(allTasksConverted);

          const taskIds = allTasksConverted.map(task => task.id);
          const allTaskTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));

          setCalendarEntries(allTaskTimeEntries);

          if (calendarRef.current && calendarRef.current.updateEntries) {
            calendarRef.current.updateEntries(allTaskTimeEntries);
          }
        }
      } else {
        const userId = user?.id;
        if (!userId) {
          console.error('User ID not available');
          return false;
        }

        const assignedTasks = await taskService.getAssignedTasks(userId);

        if (assignedTasks && assignedTasks.length > 0) {
          const assignedTaskIds = assignedTasks.map(item => item.task_id);

          const userTasks = allTasksConverted.filter(task => assignedTaskIds.includes(task.id));

          const taskIds = userTasks.map(task => task.id);
          const userTimeEntries = allTimeEntries.filter(entry => taskIds.includes(entry.task_id));

          setFilteredTasks(userTasks);
          setCalendarEntries(userTimeEntries);

          if (calendarRef.current && calendarRef.current.updateEntries) {
            calendarRef.current.updateEntries(userTimeEntries);
          }
        } else {
          setFilteredTasks([]);
          setCalendarEntries([]);

          if (calendarRef.current && calendarRef.current.updateEntries) {
            calendarRef.current.updateEntries([]);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error refreshing time entries:', error);
      return false;
    }
  }, [hasElevatedPermissions, user, fetchUsers, fetchClients, getToken, selectedClient]);

  const handleTimeEntryCreate = async (entry: TimeEntry): Promise<void> => {
    try {
      if (entry.start_time && entry.end_time) {
        await timeEntryService.create({
          task_id: entry.taskId,
          start_time: entry.start_time,
          end_time: entry.end_time,
          description: entry.description || ''
        });

        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(currentDate);
        endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
        endDate.setHours(23, 59, 59, 999);

        await handleRefreshTimeEntries(startDate, endDate);
        return;
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      setError('Error saving time entry on server');
      throw error;
    }
  };

  // Handler for updating a time entry
  const handleTimeEntryUpdate = async (entryId: number, data: TimeEntryUpdate): Promise<void> => {
    try {
      console.log(`Attempting to update time entry ${entryId} with data:`, data);
      await timeEntryService.updateTimeEntry(entryId, data);
      console.log(`Time entry ${entryId} updated successfully.`);

      // Refresh entries after update
      // Determine the current date range shown in the calendar to refresh correctly
      // For simplicity, we'll refresh the current week as handleRefreshTimeEntries does by default
      // If the calendar component manages its own date range internally, this might need adjustment
      // or the calendar component could expose its current range.
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()));
      endDate.setHours(23, 59, 59, 999);

      await handleRefreshTimeEntries(startDate, endDate); // Refresh data

    } catch (error) {
      console.error('Error updating time entry:', error);
      setError('Error al actualizar la entrada de tiempo en el servidor.');
      // Re-throw the error if the modal needs to display it
      throw error;
    }
  };


  const handleClientFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientValue = event.target.value;
    setSelectedClient(clientValue === "all" ? null : clientValue);

    if (clientValue !== "all") {
      const clientTasks = allTasks.filter(task => task.client === clientValue);
      const taskIds = clientTasks.map(task => task.id);
      const clientTimeEntries = timeEntries.filter(entry => taskIds.includes(entry.task_id));

      setFilteredTasks(clientTasks);
      setCalendarEntries(clientTimeEntries);

      if (calendarRef.current && calendarRef.current.updateEntries) {
        calendarRef.current.updateEntries(clientTimeEntries);
      }
    } else {
      setFilteredTasks(allTasks);
      const taskIds = allTasks.map(task => task.id);
      const allTaskTimeEntries = timeEntries.filter(entry => taskIds.includes(entry.task_id));

      setCalendarEntries(allTaskTimeEntries);

      if (calendarRef.current && calendarRef.current.updateEntries) {
        calendarRef.current.updateEntries(allTaskTimeEntries);
      }
    }
  }, [allTasks, timeEntries]);

  const getUserName = useCallback((userId: number): string => {
    const foundUser = users.find(u => {
      const uid = typeof u.id === 'string' ? parseInt(u.id, 10) : u.id;
      return uid === userId;
    });
    return foundUser ? foundUser.username : `Usuario ${userId}`;
  }, [users]);

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
          <div className="mb-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2 w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded w-1/3"></div>
          </div>
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
          Asuntos {!hasElevatedPermissions() && "Asignadas"}
          {hasElevatedPermissions() && selectedClient ? `del Cliente: ${selectedClient}` : hasElevatedPermissions() ? " (Todos)" : ""}
          {isLoading && (
            <span className="ml-3">
              <div className="h-4 w-4 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            </span>
          )}
        </h2>

        {isLoading || isLoadingClients ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="border rounded-lg p-4 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-gray-500 p-4 text-center bg-gray-50 rounded-lg border border-gray-100">
            No hay asuntos disponibles. {!hasElevatedPermissions() && "Crea una tarea o contacta a un abogado senior o socio para que te asigne una."}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks
                .slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage)
                .map((task) => {
                  return (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderLeft: `4px solid ${getStatusColor(task.status)}` }}
                    >
                      <h3 className="font-medium text-lg">{task.title}</h3>
                      <div className="mt-2 text-sm text-gray-600">
                        <p><span className="font-medium">Estado:</span> {task.status}</p>
                        <p><span className="font-medium">Cliente:</span> {task.client_name || 'Cliente no asignado'}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">{currentPage}</span>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    prev < Math.ceil(filteredTasks.length / tasksPerPage) ? prev + 1 : prev
                  )
                }
                disabled={currentPage >= Math.ceil(filteredTasks.length / tasksPerPage)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          Registros de Tiempo {!hasElevatedPermissions() && "de Tus Asuntos Asignadas"}
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
          onTimeEntryUpdate={handleTimeEntryUpdate} // Pass the update handler
          userMap={getUserName}
          currentUserId={user?.id ? Number(user.id) : undefined}
          userColorMap={userColorMap}
        />
      </div>
    </div>
  );
};

export default Workspace;