'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from "../../components/Sidebar";
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { getUserData } from '@/services/authService';
import FloatingTimer from '@/components/FloatingTimer';
import taskService from '@/services/taskService';
import timeEntryService from '@/services/timeEntryService';
import { Task } from '@/types/task';

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

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  // Function to fetch tasks for the timer
  const fetchTasks = useCallback(async () => {
    try {
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
        setTasks(allTasksData);
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
          setTasks(userTasks);
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
  }, [pathname]);

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
        fetchTasks();
      }
    };

    checkAuth();
  }, [user, setUser, router, getToken, fetchTasks]);

  // Refresh tasks periodically or when user changes
  useEffect(() => {
    if (user) {
      fetchTasks();
      
      // Refresh tasks every 5 minutes
      const intervalId = setInterval(fetchTasks, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, fetchTasks]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
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
