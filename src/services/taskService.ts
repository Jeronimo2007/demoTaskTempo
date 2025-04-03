import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AssignedTask {
  task_id: number;
  client_id: number;
}

export interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client?: string;
  client_id: number;
  client_name?: string;
  name: string;
}

const getToken = (): string => {
  if (typeof document === 'undefined') return "";
  
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1] || "";
};

export const taskService = {
  // Get all tasks
  getAllTasks: async (start_date?: Date, end_date?: Date): Promise<Task[]> => {
    const token = getToken();
    try {
      // Build the URL with query parameters for start_date and end_date if provided
      let url = `${API_URL}/tasks/get_task`;
      const params = new URLSearchParams();
      
      // Add start_date and end_date to params if they exist
      if (start_date) {
        params.append('start_date', start_date.toISOString());
      }
      if (end_date) {
        params.append('end_date', end_date.toISOString());
      }
      
      // Append params to URL if any exist
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      
      console.log('Fetching tasks with URL:', url);
      
      const response = await axios.get<Task[]>(
        url,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Ensure client_id is always a number
      return response.data.map(task => ({
        ...task,
        client_id: Number(task.client_id),
        name: task.title // Use title as name if name is not provided
      }));
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      // Return empty array to prevent crashes
      return [];
    }
  },

  // Get tasks assigned to a specific user
  getAssignedTasks: async (userId?: number | string): Promise<AssignedTask[]> => {
    const token = getToken();
    try {
      // Prepare the URL with query parameters if userId is provided
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
      // Return empty array to prevent crashes
      return [];
    }
  },
  
  // Add a new task
  createTask: async (taskData: Omit<Task, 'id'>): Promise<Task> => {
    const token = getToken();
    try {
      // Ensure client_id is a number before sending
      const processedData = {
        ...taskData,
        client_id: Number(taskData.client_id)
      };
      
      const response = await axios.post<Task>(
        `${API_URL}/tasks/create_task`,
        processedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return {
        ...response.data,
        client_id: Number(response.data.client_id)
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },
  
  // Update an existing task
  updateTask: async (taskId: number, taskData: Partial<Task>): Promise<Task> => {
    const token = getToken();
    try {
      // Ensure client_id is a number if it's included in the update
      const processedData = taskData.client_id !== undefined 
        ? { ...taskData, client_id: Number(taskData.client_id) }
        : taskData;
        
      const response = await axios.put<Task>(
        `${API_URL}/tasks/update_task/${taskId}`,
        processedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return {
        ...response.data,
        client_id: Number(response.data.client_id)
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
        `${API_URL}/tasks/delete_task/${taskId}`,
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
