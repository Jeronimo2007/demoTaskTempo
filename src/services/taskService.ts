import axios from 'axios';
import { Task } from '../types/task'; // Import the updated Task type

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Interface matching backend TaskCreate model
interface TaskCreatePayload {
  client_id: number;
  title: string;
  billing_type: 'hourly' | 'percentage' | 'mensual' | 'fija';
  status: string;
  area?: string | null;
  note?: string | null;
  total_value?: number | null;
  due_date?: string | null;
  permanent: boolean;
  tarif?: number | null; // Optional float value for permanent task rate
  facturado?: string; // Estado de facturación: 'si', 'no', 'parcialmente'
}


// Interface matching backend TaskUpdate model
interface TaskUpdatePayload {
    id: number; // Required by the backend model for update payload
    title?: string | null;
    status?: string | null;
    area?: string | null;
    billing_type?: 'hourly' | 'percentage' | 'mensual' | 'fija' | null;
    note?: string | null;
    total_value?: number | null;
    tarif?: number | null; // Optional float value for permanent task rate
    facturado?: string; // Estado de facturación: 'si', 'no', 'parcialmente'
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


      const response = await axios.get<Task[]>( // Expecting array of updated Task objects
        url,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Raw tasks response data:", response.data); // New debug log
      // Map response to ensure it conforms to Task interface and handle potential missing fields
      return response.data.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        due_date: task.due_date,
        assignment_date: task.assignment_date,
        client_id: Number(task.client_id), // Ensure client_id is number
        client_name: task.client_name,
        billing_type: task.billing_type,
        area: task.area,
        note: task.note,
        total_value: task.total_value,
        total_billed: task.total_billed,
        client: task.client,
        name: task.name, // Or task.title, depending on desired mapping
        permanent: task.permanent,
        tarif: task.tarif ?? null, // Explicitly include tarif, defaulting to null if not present
        facturado: task.facturado ?? 'no', // Always include facturado, default to 'no' if missing
      }));
    } catch {
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
    } catch {
      return [];
    }
  },

  // Add a new task using TaskCreatePayload
  createTask: async (taskData: TaskCreatePayload): Promise<Task> => {
    const token = getToken();
    try {
      const response = await axios.post<Task>(
        `${API_URL}/tasks/create`,
        taskData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      // Assuming response.data matches the updated Task interface
      return {
          ...response.data,
          client_id: Number(response.data.client_id) // Ensure client_id is number in returned object
      };
    } catch {
      throw new Error("Failed to create task");
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
    } catch {
      throw new Error("Failed to update task");
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
    } catch {
      throw new Error("Failed to delete task");
    }
  },

  // Get tasks by client
  getTasksByClient: async (clientId: number): Promise<Task[]> => {
    const token = getToken();
    try {
      const response = await axios.post<Task[]>(
        `${API_URL}/tasks/get_tasks_by_client`,
        { client_id: clientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch {
      return [];
    }
  }
};

export default taskService;

// --- PATCH: Update getTasksByClient to use GET with query param ---
taskService.getTasksByClient = async (clientId: number): Promise<Task[]> => {
  const token = getToken();
  try {
    const response = await axios.get<Task[]>(
      `${API_URL}/tasks/get_tasks_by_client?client_id=${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch {
    return [];
  }
};
