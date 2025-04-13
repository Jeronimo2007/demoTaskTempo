'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from "../../components/Sidebar";
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Added useSearchParams
import TimerSidebar from '@/components/TimerSidebar';
import taskService from '@/services/taskService';
import timeEntryService from '@/services/timeEntryService';
import { Task } from '@/types/task';
import { User } from '@/store/useAuthStore'; // Import User type if not already implicitly available
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
  const searchParams = useSearchParams(); // Added searchParams hook
  console.log("Layout Render - Search Params:", searchParams.toString()); // Log params on render
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleParamsProcessed, setGoogleParamsProcessed] = useState(false); // Track if params were handled
  const [isLoading, setIsLoading] = useState(true);
  
  // Reference to track if timer is active to prevent unnecessary updates
  const timerActiveRef = useRef<boolean>(false);

  // Function to track timer state
  const setTimerActive = (isActive: boolean) => {
    timerActiveRef.current = isActive;
  };

  // Function to fetch tasks for the timer
  // Modified to accept currentUser argument
  const fetchTasks = useCallback(async (forceUpdate = false, currentUser: User | null) => {
    try {
       console.log("fetchTasks - Received currentUser:", currentUser); // Log received user
      // Skip update if timer is active and this is not a forced update
      if (timerActiveRef.current && !forceUpdate) {
        return;
      }
      
      setIsLoading(true);
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1] || "";
      
      // Use currentUser argument for check
      if (!token || !currentUser) {
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
      const userRole = currentUser?.role?.toLowerCase(); // Safely access role and lowercase it
      const isElevated = userRole && ['senior', 'socio'].includes(userRole);
      console.log(`fetchTasks - Role check: Role='${userRole}', IsElevated=${isElevated}`); // Log role and check result
      // Use currentUser argument for role check
      if (isElevated) {
        console.log("fetchTasks - Executing elevated permissions branch (socio/senior)"); // Log branch
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
        console.log("fetchTasks - Executing regular user branch"); // Log branch
        // Use currentUser argument for ID
        const userId = currentUser.id;
        const assignedTasks = userId ? await taskService.getAssignedTasks(userId) : []; // Handle potential undefined ID
        
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
  }, []); // Removed 'user' dependency as it's now passed as an argument

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
    // Pass the current user from the component scope here
    fetchTasks(true, user);
  }, [pathname, fetchTasks]);

// Effect specifically for handling Google Auth redirect parameters ONCE
useEffect(() => {
  const googleAccessToken = searchParams.get("access_token");
  const googleUserId = searchParams.get("user_id");
  const googleUsername = searchParams.get("username");
  const googleRole = searchParams.get("role");

  // Process only if params exist AND haven't been processed yet in this session
  if (!googleParamsProcessed && googleAccessToken && googleUserId && googleUsername && googleRole) {
    console.log("Google Param Handler Effect - Params found:", { googleAccessToken, googleUserId, googleUsername, googleRole });
    try {
      const userToSet = { id: googleUserId, username: googleUsername, role: googleRole };
+      console.log("Google Param Handler Effect - User object BEFORE setUser:", userToSet); // Log user object
      // Set user state
+      setUser(userToSet, googleAccessToken);
      console.log("Google Param Handler Effect - Store state AFTER setUser:", useAuthStore.getState().user); // Log state directly from store
      console.log("Google Param Handler Effect - setUser called. Marking as processed.");
      setGoogleParamsProcessed(true); // Mark as processed to prevent re-running logic

      // Clean the URL parameters
      console.log("Google Param Handler Effect - Calling router.replace('/lawspace')...");
      router.replace('/lawspace', undefined); // Clean URL - added undefined scroll option

      // No return needed here as this effect should only run when params change
    } catch (error) {
      console.error("Google Param Handler Effect - Error processing Google Auth params:", error);
      router.push('/login?error=google_auth_failed');
    }
  } else if (!googleParamsProcessed && (googleAccessToken || googleUserId || googleUsername || googleRole)) {
      // Handle incomplete params (optional, could be done in main effect)
      console.warn("Google Param Handler Effect - Incomplete Google Auth params detected. Redirecting to login.");
      // Avoid immediate redirect if user might exist from storage
      if (!user) {
          router.push('/login?error=google_incomplete_params');
      }
  } // Removed the 'else' part, let the main effect handle non-Google cases
  // Run ONLY when searchParams changes OR user state changes (to handle incomplete param redirect logic)
}, [searchParams, setUser, router, user, googleParamsProcessed]); // Added googleParamsProcessed dependency


// Effect for general Auth Check and Task Fetching
useEffect(() => {
  const checkAuthAndFetch = async () => {
    // Get the LATEST user state directly from the store inside the effect
    const currentUser = useAuthStore.getState().user;
    console.log("Main Auth Effect - Running. User from store state:", currentUser);

    // If user is already set (either by Google handler or localStorage), fetch tasks
    // Use the freshly retrieved currentUser for checks
    if (currentUser) {
      console.log("Main Auth Effect - User exists. Fetching tasks. User Role:", currentUser.role);
      fetchTasks(true, currentUser); // Pass currentUser
      return; // Already authenticated, tasks fetched (or will be)
    }

    // --- Try to recover session from localStorage (only if user is not set) ---
    console.log("Main Auth Effect - User state is null. Checking localStorage...");
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        console.log("Main Auth Effect - Recovering session from localStorage.");
        // Call setUser from the hook, but the logic continues based on currentUser
        setUser(JSON.parse(storedUser), storedToken); // This triggers a re-render, but doesn't affect this run
        // Note: fetchTasks will be called in the *next* run of this effect because 'user' dependency changed
        return; // Session recovered, exit check for this run
      } catch (error) {
        console.error('Main Auth Effect - Error recovering session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    // --- Redirect to login if no user and no recovery ---
    // Check if Google params are currently present - if so, wait for the other effect
    const googleAccessToken = searchParams.get("access_token"); // Check again here
    if (googleAccessToken) { // Just check one param as an indicator
        console.log("Main Auth Effect - Google params detected, deferring login redirect.");
        return; // Give the other effect time to process
    }

    console.log("Main Auth Effect - No currentUser, no recovery, no Google params. Redirecting to /login.");
    router.push('/login');
  };

  checkAuthAndFetch();
  // Dependencies: user state, router, setUser, fetchTasks. Crucially, NOT searchParams here.
}, [user, router, setUser, fetchTasks]); // Removed searchParams

  // Refresh tasks periodically or when user changes
  useEffect(() => {
    if (user) {
      fetchTasks(true, user); // Pass component-scoped user
      
      // Refresh tasks every 5 minutes, but only if timer is not active
      const intervalId = setInterval(() => {
        fetchTasks(false, user); // Pass component-scoped user
      }, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, fetchTasks]); // Keep user dependency here

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
          <TimerSidebar
            tasks={tasks}
            onTimeEntryCreate={handleTimeEntryCreate}
            onEntryCreated={handleEntryCreated}
          />
        )}
      </div>
    </div>
  );
}
