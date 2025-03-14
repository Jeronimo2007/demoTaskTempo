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
  assigned_to: string;
  color: string; // We'll still generate this client-side
}

// Define roles with elevated access (can see all tasks and time entries)
const ELEVATED_ROLES = ['senior', 'socio'];

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

  // Fetch tasks data
  const fetchData = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Assign colors to tasks based on their title
      let tasksWithColors = response.data.map((task: Task) => {
        // Generate a color based on the task title
        const hash = task.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const hue = hash % 360;
        return {
          ...task,
          color: `hsl(${hue}, 70%, 50%)`
        };
      });

      // Store all tasks for reference (needed for time entry filtering)
      setAllTasks(tasksWithColors);

      // Filter tasks if user doesn't have elevated permissions
      if (user && !hasElevatedPermissions()) {
        tasksWithColors = tasksWithColors.filter((task: Task) => 
          task.assigned_to === user.username || task.assigned_to === user.id
        );
      }

      setTasks(tasksWithColors);
      setError(null);
      
      // Fetch time entries from API
      fetchTimeEntries(tasksWithColors);
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
  }, [router, hasElevatedPermissions, user]);

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
  const fetchTimeEntries = useCallback(async (userTasks = tasks) => {
    setIsLoadingEntries(true);
    try {
      const entries = await timeEntryService.getAllTimeEntries();
      
      // Filter time entries based on user role
      if (user && !hasElevatedPermissions()) {
        // For regular users, show only time entries related to their assigned tasks
        const userTaskIds = userTasks.map(task => task.id);
        const filteredEntries = entries.filter(entry => userTaskIds.includes(entry.task_id));
        setTimeEntries(filteredEntries);
      } else {
        // For elevated roles, show all time entries
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Error al cargar los registros de tiempo del servidor');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [tasks, user, hasElevatedPermissions]);

  // Handle refresh of time entries (e.g. from Calendar component)
  const handleRefreshTimeEntries = useCallback(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  // Handle creation of new time entries
  const handleTimeEntryCreate = async (entry: TimeEntry) => {
    try {
      if (entry.start_time && entry.end_time) {
        await timeEntryService.create({
          task_id: entry.taskId,
          start_time: entry.start_time.toISOString(),
          end_time: entry.end_time.toISOString()
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

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          Tareas {!hasElevatedPermissions() && "Asignadas a Ti"}
          {hasElevatedPermissions() && " (Todas)"}
        </h2>
        {tasks.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No hay tareas disponibles. {!hasElevatedPermissions() && "Contacta a un abogado senior o socio para que te asignen tareas."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${task.color}` }}
            >
              <h3 className="font-medium text-lg">{task.title}</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p><span className="font-medium">Estado:</span> {task.status}</p>
                <p><span className="font-medium">Fecha de Vencimiento:</span> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</p>
                <p><span className="font-medium">Cliente:</span> {task.client}</p>
                <p><span className="font-medium">Asignado a:</span> {task.assigned_to}</p>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Calendar showing time entries from API */}
      <div>
        <h2 className="text-xl font-semibold mb-3">
          Registros de Tiempo {!hasElevatedPermissions() && "de Tus Tareas"}
          {hasElevatedPermissions() && " (Todos)"}
        </h2>
        <TimeEntryCalendar 
          apiTimeEntries={timeEntries} 
          tasks={hasElevatedPermissions() ? allTasks : tasks}
          isLoading={isLoadingEntries} 
          onRefresh={handleRefreshTimeEntries}
          onTimeEntryCreate={handleTimeEntryCreate}
        />
      </div>

      {/* Draggable timer for creating time entries */}
      <FloatingTimer tasks={tasks} onTimeEntryCreate={handleTimeEntryCreate} onEntryCreated={fetchTimeEntries} />
    </div>
  );
};

export default Workspace;
