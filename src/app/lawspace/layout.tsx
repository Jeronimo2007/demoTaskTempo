'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from "../../components/Sidebar";
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { getUserData } from '@/services/authService';
import FloatingTimer from '@/components/FloatingTimer';
import taskService from '@/services/taskService';
import timeEntryService from '@/services/timeEntryService';
import { Task } from '@/types/task';
import EventNotifications from '@/components/EventNotifications';

interface TimeEntry {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  description?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reference to track if timer is active to prevent unnecessary updates
  const timerActiveRef = useRef<boolean>(false);

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  // Function to track timer state
  const setTimerActive = (isActive: boolean) => {
    timerActiveRef.current = isActive;
  };

  // Function to fetch tasks for the timer
  const fetchTasks = useCallback(async (forceUpdate = false) => {
    try {
      // Skip update if timer is active and this is not a forced update
      if (timerActiveRef.current && !forceUpdate) {
        return;
      }
      
      setIsLoading(true);
      const token = getToken();
      
      if (!token || !user) {
        return;
      }

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

      // Get all tasks for the current week
      const allTasksData = await taskService.getAllTasks(startDate, endDate);
      
      // For users with elevated permissions (senior, socio), show all tasks
      if (user.role && ['senior', 'socio'].includes(user.role.toLowerCase())) {
        setTasks(prevTasks => {
          // Only update if there are actual changes
          if (JSON.stringify(prevTasks) !== JSON.stringify(allTasksData)) {
            return allTasksData;
          }
          return prevTasks;
        });
      } 
      // For regular users, only show assigned tasks
      else {
        const userId = user.id;
        const assignedTasks = await taskService.getAssignedTasks(userId);
        
        if (assignedTasks && assignedTasks.length > 0) {
          // Extract the task IDs that are assigned to this user
          const assignedTaskIds = assignedTasks.map(item => item.task_id);
          
          // Filter all tasks to only include those assigned to the user
          const userTasks = allTasksData.filter(task => assignedTaskIds.includes(task.id));
          
          setTasks(prevTasks => {
            // Only update if there are actual changes
            if (JSON.stringify(prevTasks) !== JSON.stringify(userTasks)) {
              return userTasks;
            }
            return prevTasks;
          });
        } else {
          setTasks([]);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks for timer:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken]);

  // Handle time entry creation
  const handleTimeEntryCreate = async (entry: TimeEntry): Promise<void> => {
    try {
      if (entry.start_time && entry.end_time) {
        await timeEntryService.create({
          task_id: entry.taskId,
          start_time: entry.start_time,
          end_time: entry.end_time,
          description: entry.description || ''
        });
        
        // Set timer as not active after saving
        setTimerActive(false);
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      throw error;
    }
  };

  // Refresh time entries after creation
  const handleEntryCreated = useCallback(() => {
    // If we're on the workspace page, we could trigger a refresh there
    if (pathname === '/lawspace') {
      // You could emit a custom event that the workspace page listens for
      const event = new CustomEvent('timeEntryCreated');
      window.dispatchEvent(event);
    }
    
    // Force update tasks after saving an entry
    fetchTasks(true);
  }, [pathname, fetchTasks]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      
      if (!token) {
        router.push('/login');
        return;
      }

      if (!user) {
        try {
          const userData = await getUserData(token);
          if (userData && userData.id && userData.role) {
            setUser(userData, token);
          } else {
            router.push('/login');
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          router.push('/login');
        }
      } else {
        // Fetch tasks for the timer when user is available
        fetchTasks(true);
      }
    };

    checkAuth();
  }, [user, setUser, router, getToken, fetchTasks]);

  // Refresh tasks periodically or when user changes
  useEffect(() => {
    if (user) {
      fetchTasks(true);
      
      // Refresh tasks every 5 minutes, but only if timer is not active
      const intervalId = setInterval(() => {
        fetchTasks(false); // Don't force update on intervals
      }, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, fetchTasks]);

  // Custom event listener for timer state updates
  useEffect(() => {
    const handleTimerStateChange = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.isActive === 'boolean') {
        setTimerActive(e.detail.isActive);
      }
    };

    window.addEventListener('timerStateChange', handleTimerStateChange as EventListener);
    
    return () => {
      window.removeEventListener('timerStateChange', handleTimerStateChange as EventListener);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {/* Top bar with notifications */}
        <div className="bg-white p-4 shadow-sm flex justify-end items-center">
          <EventNotifications />
        </div>
        
        <main className="p-6 min-h-screen">{children}</main>
        
        {!isLoading && tasks.length > 0 && (
          <FloatingTimer
            tasks={tasks}
            onTimeEntryCreate={handleTimeEntryCreate}
            onEntryCreated={handleEntryCreated}
          />
        )}
      </div>
    </div>
  );
}
