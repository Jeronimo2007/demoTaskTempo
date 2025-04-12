import axios from 'axios';
import { Task } from '../types/task'; // Import the updated Task type

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Interface matching backend TaskCreate model
interface TaskCreatePayload {
    client_id: number;
    title: string;
    billing_type: 'hourly' | 'percentage';
    status: string;
    area?: string | null;
    note?: string | null;
    total_value?: number | null;
}

// Interface matching backend TaskUpdate model
interface TaskUpdatePayload {
    id: number; // Required by the backend model for update payload
    title?: string | null;
    status?: string | null;
    due_date?: string | null; // Keep consistent with Task type? Backend model shows Optional[str]
    area?: string | null;
    billing_type?: 'hourly' | 'percentage' | null;
    note?: string | null;
    total_value?: number | null;
}

export interface AssignedTask {
  task_id: number;
  client_id: number;
}

const getToken = (): string => {
  if (typeof document === 'undefined') return "";

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1] || "";
};

export const taskService = {
  // Get all tasks - Assuming backend still returns data compatible with the updated Task interface
  getAllTasks: async (start_date?: Date, end_date?: Date): Promise<Task[]> => {
    const token = getToken();
    try {
      let url = `${API_URL}/tasks/get_task`;
      const params = new URLSearchParams();

      if (start_date) {
        params.append('start_date', start_date.toISOString());
      }
      if (end_date) {
        params.append('end_date', end_date.toISOString());
      }

      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }

      console.log('Fetching tasks with URL:', url);

      const response = await axios.get<Task[]>( // Expecting array of updated Task objects
        url,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Map response if necessary, ensure client_id is number, handle potential missing fields
      return response.data.map(task => ({
        ...task,
        client_id: Number(task.client_id), // Ensure client_id is number
        name: task.title // Keep mapping title to name for compatibility? Review if 'name' is still needed.
      }));
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  },

  // Get tasks assigned to a specific user
  getAssignedTasks: async (userId?: number | string): Promise<AssignedTask[]> => {
    const token = getToken();
    try {
      let url = `${API_URL}/tasks/get_assigned_tasks`;
      if (userId !== undefined) {
        url += `?user_id=${userId}`;
      }

      const response = await axios.get<AssignedTask[]>(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
      return [];
    }
  },

  // Add a new task using TaskCreatePayload
  createTask: async (taskData: TaskCreatePayload): Promise<Task> => {
    const token = getToken();
    try {
      // Construct payload matching TaskCreatePayload, ensuring only valid fields are sent
      const payload: TaskCreatePayload = {
          client_id: Number(taskData.client_id), // Ensure client_id is a number
          title: taskData.title,
          billing_type: taskData.billing_type,
          status: taskData.status,
          // Include optional fields only if they have a value (not undefined)
          ...(taskData.area !== undefined && { area: taskData.area }),
          ...(taskData.note !== undefined && { note: taskData.note }),
          ...(taskData.total_value !== undefined && { total_value: taskData.total_value }),
      };

      const response = await axios.post<Task>( // Assuming backend returns the full Task object upon creation
        `${API_URL}/tasks/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Assuming response.data matches the updated Task interface
      return {
          ...response.data,
          client_id: Number(response.data.client_id) // Ensure client_id is number in returned object
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Update an existing task using TaskUpdatePayload
  updateTask: async (taskId: number, taskData: Partial<Omit<TaskUpdatePayload, 'id'>>): Promise<Task> => {
    const token = getToken();
    try {
      // Construct payload matching TaskUpdate, including the id
      const payload: TaskUpdatePayload = {
        id: taskId, // Add the task ID to the payload
        ...taskData // Spread the fields to be updated
      };

      // Optional: Clean payload - remove undefined/null keys if backend requires it
      // Object.keys(payload).forEach(key => {
      //   const K = key as keyof TaskUpdatePayload;
      //   if (payload[K] === undefined || payload[K] === null) {
      //      delete payload[K];
      //   }
      // });
      // Ensure client_id is number if present
      // if (payload.client_id !== undefined && payload.client_id !== null) {
      //     payload.client_id = Number(payload.client_id);
      // }


      const response = await axios.put<Task>( // Assuming backend returns the full Task object upon update
        `${API_URL}/tasks/update/${taskId}`, // ID still in URL for endpoint routing
        payload, // Send payload including the id and updated fields
        { headers: { Authorization: `Bearer ${token}` } }
      );
       // Assuming response.data matches the updated Task interface
      return {
          ...response.data,
          client_id: Number(response.data.client_id) // Ensure client_id is number in returned object
      };
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Delete a task
  deleteTask: async (taskId: number): Promise<{ success: boolean }> => {
    const token = getToken();
    try {
      const response = await axios.delete<{ success: boolean }>(
        `${API_URL}/tasks/delete/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};

export default taskService;
