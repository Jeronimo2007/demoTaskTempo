// Define a shared Task interface to be used across components
export interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client_id: number; // Changed from string to number for consistency
  client_name?: string; // Optional client name
  client?: string; // Contains the client name
}

// Define a TaskWithAssignments interface that extends Task
export interface TaskWithAssignments extends Task {
  assignments?: any[]; // Adjust according to the actual structure
}

// Utility function to ensure task format is correct
export const ensureTaskFormat = (task: any): Task => {
  return {
    ...task,
    client_id: task.client_id !== undefined ? Number(task.client_id) : null,
    client_name: task.client_name || '',
    client: task.client || ''
  };
};
