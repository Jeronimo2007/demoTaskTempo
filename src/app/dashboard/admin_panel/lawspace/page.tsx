'use client'

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FloatingTimer from '@/components/FloatingTimer';
import TimeEntryCalendar from '@/components/Calendar';

interface Task {
  id: number;
  name: string;
  client?: string;
  color: string;
}

interface TimeEntry {
  taskId: number;
  duration: number;
  date: Date;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Workspace: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to get the token from cookies
  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/tasks/get_task`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Assign colors to tasks if they don't have one
        const tasksWithColors = response.data.map((task: any) => {
          if (!task.color) {
            // Generate a color based on the task name
            const hash = task.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const hue = hash % 360;
            task.color = `hsl(${hue}, 70%, 50%)`;
          }
          return task;
        });

        setTasks(tasksWithColors);
        setError(null);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setError('Unable to load tasks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    // Load time entries from local storage
    const loadTimeEntries = () => {
      const savedEntries = localStorage.getItem('timeEntries');
      if (savedEntries) {
        try {
          const parsedEntries = JSON.parse(savedEntries);
          // Convert date strings to Date objects
          const entriesWithDates = parsedEntries.map((entry: any) => ({
            ...entry,
            date: new Date(entry.date)
          }));
          setTimeEntries(entriesWithDates);
        } catch (error) {
          console.error('Error parsing saved time entries:', error);
        }
      }
    };

    fetchTasks();
    loadTimeEntries();
  }, [getToken]);

  // Save time entries to local storage when they change
  useEffect(() => {
    if (timeEntries.length > 0) {
      localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
    }
  }, [timeEntries]);

  // Handle creation of new time entries
  const handleTimeEntryCreate = (entry: TimeEntry) => {
    setTimeEntries((prevEntries) => [...prevEntries, entry]);

    // Optional: Send the time entry to the server
    const saveTimeEntry = async () => {
      try {
        const token = getToken();
        await axios.post(
          `${API_URL}/time_entries/create`,
          {
            task_id: entry.taskId,
            duration: entry.duration,
            date: entry.date
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Error saving time entry:', error);
        // Entry is already saved locally, so user doesn't lose data
      }
    };

    saveTimeEntry();
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
      <h1 className="text-2xl font-bold mb-4">Lawyer Workspace</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Integrate the improved calendar */}
      <TimeEntryCalendar timeEntries={timeEntries} tasks={tasks} />

      {/* Integrate the draggable timer */}
      <FloatingTimer tasks={tasks} onTimeEntryCreate={handleTimeEntryCreate} />
    </div>
  );
};

export default Workspace;
