// Define a shared Task interface to be used across components
export interface Task {
  id: number;
  title: string;
  status: string;
  due_date?: string;
  client?: string;
  client_id?: number;
  client_name?: string;
}

// Define an AssignedTask interface for task assignments
export interface AssignedTask {
  task_id: number;
  client_id: number;
}

// Define a TaskWithAssignments interface that extends Task
export interface TaskWithAssignments extends Task {
  assignments?: AssignedTask[]; // Properly typed assignments array
}

// Utility function to ensure task format is correct
export const ensureTaskFormat = (task: any): Task => {
  return {
    ...task,
    client_id: task.client_id !== undefined ? Number(task.client_id) : null,
    client_name: task.client_name || ''
  };
};
